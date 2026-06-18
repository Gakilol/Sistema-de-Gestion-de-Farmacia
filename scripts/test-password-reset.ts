import { spawn } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TEST_PORT = 3001
const BASE_URL = `http://localhost:${TEST_PORT}`
const TEST_EMAIL = 'demo@farmacia.com' // Seed user email

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de Password Reset (Código de 6 dígitos)...')

  // 1. Limpiar solicitudes e intentos de reset del correo de prueba antes de empezar
  console.log('🧹 Limpiando solicitudes previas en la base de datos...')
  await prisma.passwordResetRequest.deleteMany({ where: { correo: TEST_EMAIL } })
  await prisma.passwordResetToken.deleteMany({ where: { correo: TEST_EMAIL } })

  // 2. Iniciar el servidor Next.js en el puerto de prueba
  console.log(`📡 Iniciando servidor Next.js en puerto ${TEST_PORT}...`)
  const server = spawn('npx', ['next', 'dev', '-p', String(TEST_PORT)], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  })

  // Esperar a que el servidor esté disponible
  let attempts = 0
  let isUp = false
  while (attempts < 15) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: '' })
      })
      // Si responde, el servidor está arriba (aunque dé 400/429)
      if (res.status !== 0) {
        isUp = true
        break
      }
    } catch (e) {
      // Ignorar error de conexión
    }
    attempts++
    await delay(2000)
  }

  if (!isUp) {
    console.error('❌ El servidor de pruebas Next.js no pudo iniciar a tiempo.')
    server.kill()
    process.exit(1)
  }

  console.log('✅ Servidor Next.js activo. Iniciando peticiones de prueba...')

  try {
    // ── PRUEBA 1: Solicitud inicial y obtención de código en modo desarrollo ──
    console.log('\n--- PRUEBA 1: Solicitar código de recuperación ---')
    const reqRes = await fetch(`${BASE_URL}/api/auth/reset-password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: TEST_EMAIL })
    })

    const reqData = await reqRes.json()
    console.log('Respuesta del servidor:', reqData)
    if (!reqData.success || !reqData._dev_codigo) {
      throw new Error('No se recibió el código de desarrollo en la respuesta')
    }
    const codigoValido = reqData._dev_codigo
    console.log(`🔑 Código de desarrollo obtenido: ${codigoValido}`)

    // ── PRUEBA 2: Rate Limiting por Correo (Máx 3 solicitudes/hora) ──
    console.log('\n--- PRUEBA 2: Rate Limiting por correo (Límite: 3/hora) ---')
    // Ya hicimos 1 solicitud. Haremos la 2da y 3ra (exitosas) y la 4ta (bloqueada).
    for (let i = 2; i <= 4; i++) {
      console.log(`Solicitud #${i}...`)
      const rateRes = await fetch(`${BASE_URL}/api/auth/reset-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: TEST_EMAIL })
      })
      const rateData = await rateRes.json()
      console.log(`Estado solicitud #${i}:`, rateRes.status, rateData)
      if (i === 4) {
        if (rateRes.status !== 429) {
          throw new Error('El rate limiting por correo no bloqueó la 4ta petición')
        }
        console.log('✅ Rate limit de correo bloqueó correctamente la 4ta solicitud con código 429.')
      } else {
        if (rateRes.status !== 200) {
          throw new Error(`La solicitud #${i} falló inesperadamente`)
        }
      }
    }

    // ── PRUEBA 3: Fuerza Bruta / Lockout en Verificación (Máx 5 intentos) ──
    console.log('\n--- PRUEBA 3: Fuerza bruta en verificación (Límite: 5 intentos) ---')
    // Primero, limpiamos el rate limit de la tabla PasswordResetRequest para poder generar un nuevo código para la prueba de fuerza bruta
    await prisma.passwordResetRequest.deleteMany({ where: { correo: TEST_EMAIL } })
    
    // Generar un nuevo token para la prueba de brute-force
    const newReqRes = await fetch(`${BASE_URL}/api/auth/reset-password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: TEST_EMAIL })
    })
    const newReqData = await newReqRes.json()
    const codigoNuevo = newReqData._dev_codigo
    console.log(`Generado nuevo código para prueba de brute force: ${codigoNuevo}`)

    // Enviar 5 códigos incorrectos seguidos
    for (let intento = 1; intento <= 5; intento++) {
      console.log(`Intento fallido #${intento}...`)
      const verifyRes = await fetch(`${BASE_URL}/api/auth/reset-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: TEST_EMAIL, codigo: '111111' }) // Código incorrecto
      })
      const verifyData = await verifyRes.json()
      console.log(`Respuesta intento #${intento}:`, verifyRes.status, verifyData)
      
      if (intento === 5) {
        if (!verifyData.bloqueado) {
          throw new Error('El código no fue bloqueado tras el 5to intento fallido')
        }
        console.log('✅ El código de verificación fue bloqueado e invalidado exitosamente tras 5 intentos fallidos.')
      } else {
        if (verifyData.valido) {
          throw new Error('El código inválido fue aceptado')
        }
      }
    }

    // Probar ingresar el código correcto en el token bloqueado para verificar que no funciona
    console.log('Probando usar el código correcto en el token bloqueado...')
    const verifyCorrectOnBlocked = await fetch(`${BASE_URL}/api/auth/reset-password/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: TEST_EMAIL, codigo: codigoNuevo })
    })
    const verifyBlockedData = await verifyCorrectOnBlocked.json()
    console.log('Respuesta con código correcto en token bloqueado:', verifyBlockedData)
    if (verifyBlockedData.valido) {
      throw new Error('Se aceptó el código correcto de un token que ya fue bloqueado')
    }
    console.log('✅ El token bloqueado permanece inválido aun ingresando el código correcto.')

    // ── PRUEBA 4: Confirmación y Actualización de Contraseña exitosa ──
    console.log('\n--- PRUEBA 4: Doble verificación y confirmación de contraseña ---')
    // Limpiar rate limit para generar un token final
    await prisma.passwordResetRequest.deleteMany({ where: { correo: TEST_EMAIL } })

    const finalReqRes = await fetch(`${BASE_URL}/api/auth/reset-password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: TEST_EMAIL })
    })
    const finalReqData = await finalReqRes.json()
    const codigoFinal = finalReqData._dev_codigo

    // Validar complejidad de contraseña (debe fallar)
    console.log('Probando contraseña débil "12345"...')
    const confirmWeak = await fetch(`${BASE_URL}/api/auth/reset-password/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: TEST_EMAIL, codigo: codigoFinal, nuevaPassword: '12345' })
    })
    console.log('Respuesta de contraseña débil:', confirmWeak.status, await confirmWeak.json())
    if (confirmWeak.status !== 400) {
      throw new Error('Se aceptó una contraseña débil')
    }

    // Confirmar con contraseña fuerte
    const passwordFuerte = 'Podocare.2026!'
    console.log(`Estableciendo nueva contraseña fuerte "${passwordFuerte}"...`)
    const confirmRes = await fetch(`${BASE_URL}/api/auth/reset-password/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: TEST_EMAIL, codigo: codigoFinal, nuevaPassword: passwordFuerte })
    })

    const confirmData = await confirmRes.json()
    console.log('Respuesta confirmación:', confirmRes.status, confirmData)
    if (!confirmData.success) {
      throw new Error('Error al confirmar el cambio de contraseña')
    }
    console.log('✅ Contraseña restablecida exitosamente.')

    // Verificar en la base de datos que la contraseña cambió y los tokens están usados
    const usuarioActualizado = await prisma.usuario.findUnique({ where: { correo: TEST_EMAIL } })
    const tokensPendientes = await prisma.passwordResetToken.count({
      where: { correo: TEST_EMAIL, usado: false }
    })

    if (tokensPendientes > 0) {
      throw new Error('Aún quedan tokens pendientes activos después de reset exitoso')
    }
    console.log('✅ Verificación de base de datos exitosa: Todos los tokens del usuario fueron invalidados.')

  } catch (error) {
    console.error('❌ Error durante la ejecución de las pruebas:', error)
    server.kill()
    process.exit(1)
  } finally {
    // Detener servidor
    console.log('\n🛑 Apagando el servidor de pruebas...')
    server.kill('SIGINT')
    await prisma.$disconnect()
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA PASARON EXITOSAMENTE! 🎉')
}

runTests()
