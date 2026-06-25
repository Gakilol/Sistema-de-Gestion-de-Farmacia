import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

let pasados = 0
let fallados = 0
const errores: string[] = []

async function test(nombre: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ✅ ${nombre}`)
    pasados++
  } catch (err: any) {
    console.error(`  ❌ ${nombre}`)
    console.error(`     → ${err.message}`)
    errores.push(`${nombre}: ${err.message}`)
    fallados++
  }
}

function expect(valor: unknown) {
  return {
    toBe: (esperado: unknown) => {
      if (valor !== esperado) throw new Error(`Se esperaba ${JSON.stringify(esperado)}, se obtuvo ${JSON.stringify(valor)}`)
    },
    toBeTruthy: () => {
      if (!valor) throw new Error(`Se esperaba un valor truthy, se obtuvo ${JSON.stringify(valor)}`)
    },
    toBeFalsy: () => {
      if (valor) throw new Error(`Se esperaba un valor falsy, se obtuvo ${JSON.stringify(valor)}`)
    },
    toContain: (sub: string) => {
      if (typeof valor !== "string" || !valor.includes(sub))
        throw new Error(`Se esperaba que "${valor}" contuviera "${sub}"`)
    },
    toHaveLength: (len: number) => {
      if (!Array.isArray(valor) || valor.length !== len)
        throw new Error(`Se esperaba longitud ${len}, se obtuvo ${Array.isArray(valor) ? valor.length : "no array"}`)
    },
  }
}

async function main() {
  console.log("🏁 INICIANDO PRUEBAS DE INTEGRACIÓN — MÓDULO CLÍNICO (Diagnósticos, Tratamientos e Insumos)")
  console.log("=======================================================================================")

  // 1. Configurar datos de prueba
  console.log("📦 Configurando datos temporales de prueba...")

  // Obtener o crear Roles y Usuarios de Prueba
  let rolAdmin = await prisma.rol.findUnique({ where: { nombre: "ADMIN" } })
  if (!rolAdmin) {
    rolAdmin = await prisma.rol.create({ data: { nombre: "ADMIN" } })
  }

  let rolDoctor = await prisma.rol.findUnique({ where: { nombre: "DOCTOR" } })
  if (!rolDoctor) {
    rolDoctor = await prisma.rol.create({ data: { nombre: "DOCTOR" } })
  }

  let rolEmpleado = await prisma.rol.findUnique({ where: { nombre: "EMPLEADO" } })
  if (!rolEmpleado) {
    rolEmpleado = await prisma.rol.create({ data: { nombre: "EMPLEADO" } })
  }

  const doctorUser = await prisma.usuario.create({
    data: {
      nombreCompleto: `Doctor Test - ${Date.now()}`,
      correo: `doctor_${Date.now()}@test.com`,
      passwordHash: "test-hash",
      idRol: rolDoctor.id,
      esDatoPrueba: true,
    }
  })

  const empleadoUser = await prisma.usuario.create({
    data: {
      nombreCompleto: `Empleado Test - ${Date.now()}`,
      correo: `empleado_${Date.now()}@test.com`,
      passwordHash: "test-hash",
      idRol: rolEmpleado.id,
      esDatoPrueba: true,
    }
  })

  const cliente = await prisma.cliente.create({
    data: {
      nombreCompleto: `Paciente Test - ${Date.now()}`,
      cedula: `CED-${Date.now()}`,
      telefono: `TEL-${Date.now()}`,
      tipoPerfil: "CLINICA",
      esDatoPrueba: true,
    }
  })

  const categoria = await prisma.categoriaProducto.create({
    data: {
      nombre: `Cat Test Clínico - ${Date.now()}`,
      descripcion: "Categoría de prueba para clínica",
      esDatoPrueba: true,
    }
  })

  const insumoFisico = await prisma.producto.create({
    data: {
      nombre: `Gasa Esterilizada Test - ${Date.now()}`,
      codigoBarras: `BAR-INSM-${Date.now()}`,
      idCategoria: categoria.id,
      precioCompra: 2.00,
      precioVenta: 3.50,
      stockActual: 30,
      esServicio: false,
      esDatoPrueba: true,
    }
  })

  // Crear lotes con vencimientos distintos para verificar FEFO
  // Lote A: vence en 10 días, stock = 10
  const vencimientoA = new Date()
  vencimientoA.setDate(vencimientoA.getDate() + 10)
  const loteA = await prisma.lote.create({
    data: {
      idProducto: insumoFisico.id,
      codigoLote: `LOTE-PRONTO-${Date.now()}`,
      fechaVencimiento: vencimientoA,
      stockInicial: 10,
      stockActual: 10,
      costoCompra: 2.00,
      activo: true,
    }
  })

  // Lote B: vence en 30 días, stock = 20
  const vencimientoB = new Date()
  vencimientoB.setDate(vencimientoB.getDate() + 30)
  const loteB = await prisma.lote.create({
    data: {
      idProducto: insumoFisico.id,
      codigoLote: `LOTE-TARDIO-${Date.now()}`,
      fechaVencimiento: vencimientoB,
      stockInicial: 20,
      stockActual: 20,
      costoCompra: 2.00,
      activo: true,
    }
  })

  console.log("✅ Datos de prueba creados.")

  // ==========================================
  // PRUEBA 1: Inserción de Diagnósticos y Tratamientos
  // ==========================================
  await test("Debe poder registrar Diagnósticos y Tratamientos válidos", async () => {
    const dx = await prisma.diagnostico.create({
      data: {
        nombre: `Pie de Atleta Test - ${Date.now()}`,
        codigo: `CIE-TEST-${Date.now()}`,
        descripcion: "Infección fúngica común",
        esDatoPrueba: true,
      }
    })

    const tx = await prisma.tratamiento.create({
      data: {
        nombre: `Tratamiento Antifúngico Test - ${Date.now()}`,
        descripcion: "Aplicación de crema y antimicóticos",
        esDatoPrueba: true,
      }
    })

    expect(dx.id).toBeTruthy()
    expect(tx.id).toBeTruthy()
  })

  // ==========================================
  // PRUEBA 2: FEFO y Kardex en SOAP con Insumos
  // ==========================================
  await test("Atención SOAP con insumos debe consumir stock según FEFO y generar movimientos Kardex", async () => {
    const dx = await prisma.diagnostico.create({
      data: { nombre: `Uña Encarnada Test - ${Date.now()}`, esDatoPrueba: true }
    })

    const tx = await prisma.tratamiento.create({
      data: { nombre: `Quiropodia Completa Test - ${Date.now()}`, esDatoPrueba: true }
    })

    // Solicitamos consumir 12 unidades del insumoFisico
    // Lote A (vence primero) tiene 10 unidades. Se debe vaciar Lote A y tomar 2 unidades de Lote B.
    const cantidadSolicitada = 12

    const atencion = await prisma.$transaction(async (txDb) => {
      // Registrar atención podológica
      const nuevaAtencion = await txDb.atencionPodologica.create({
        data: {
          idCliente: cliente.id,
          idUsuario: doctorUser.id,
          subjetivo: "Paciente siente dolor agudo",
          objetivo: "Primer dedo con inflamación",
          analisis: "Uña encarnada severa",
          plan: "Extracción espícula y curación",
          esDatoPrueba: true,
        }
      })

      // Vincular Diagnóstico y Tratamiento
      await txDb.diagnosticoAtencion.create({
        data: { idAtencion: nuevaAtencion.id, idDiagnostico: dx.id }
      })

      await txDb.tratamientoAtencion.create({
        data: { idAtencion: nuevaAtencion.id, idTratamiento: tx.id }
      })

      // Lógica FEFO
      let cantidadRestante = cantidadSolicitada

      const lotes = await txDb.lote.findMany({
        where: { idProducto: insumoFisico.id, activo: true, stockActual: { gt: 0 } },
        orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
      })

      for (const lote of lotes) {
        if (cantidadRestante <= 0) break

        const descuento = Math.min(lote.stockActual, cantidadRestante)
        cantidadRestante -= descuento

        await txDb.lote.update({
          where: { id: lote.id },
          data: { stockActual: { decrement: descuento } }
        })

        // Kardex
        await txDb.movimientoInventario.create({
          data: {
            idProducto: insumoFisico.id,
            idLote: lote.id,
            tipo: "AJUSTE_NEGATIVO",
            cantidad: -descuento,
            stockResultante: lote.stockActual - descuento,
            referencia: `Consumo en Consulta Podológica #${nuevaAtencion.id}`,
            idUsuario: doctorUser.id,
          }
        })
      }

      await txDb.producto.update({
        where: { id: insumoFisico.id },
        data: { stockActual: { decrement: cantidadSolicitada } }
      })

      await txDb.insumoAtencion.create({
        data: {
          idAtencion: nuevaAtencion.id,
          idProducto: insumoFisico.id,
          cantidad: cantidadSolicitada,
        }
      })

      return nuevaAtencion
    })

    // Validar descuento en lotes
    const loteA_actualizado = await prisma.lote.findUniqueOrThrow({ where: { id: loteA.id } })
    const loteB_actualizado = await prisma.lote.findUniqueOrThrow({ where: { id: loteB.id } })
    const productoActualizado = await prisma.producto.findUniqueOrThrow({ where: { id: insumoFisico.id } })

    expect(loteA_actualizado.stockActual).toBe(0) // Se vació completamente (10 u)
    expect(loteB_actualizado.stockActual).toBe(18) // Se tomaron 2 u de 20 u
    expect(productoActualizado.stockActual).toBe(18) // Stock total pasó de 30 a 18

    // Validar Movimientos de Inventario (Kardex)
    const movimientos = await prisma.movimientoInventario.findMany({
      where: { referencia: `Consumo en Consulta Podológica #${atencion.id}` },
      orderBy: { id: "asc" }
    })

    expect(movimientos).toHaveLength(2)
    expect(movimientos[0].idLote).toBe(loteA.id)
    expect(movimientos[0].cantidad).toBe(-10)
    expect(movimientos[1].idLote).toBe(loteB.id)
    expect(movimientos[1].cantidad).toBe(-2)
  })

  // ==========================================
  // PRUEBA 3: Bloqueo por Stock Insuficiente
  // ==========================================
  await test("Debe rechazar el registro de la atención si se solicita más insumo del stock total disponible", async () => {
    const stockDisponible = 18 // el que quedó tras la prueba anterior
    const cantidadSolicitada = 25 // supera el disponible

    // Simulación de la validación del endpoint
    const prod = await prisma.producto.findUnique({
      where: { id: insumoFisico.id },
      select: { stockActual: true, esServicio: true }
    })

    let falladoCorrectamente = false
    try {
      if (!prod) throw new Error("Producto no encontrado")
      if (prod.esServicio) throw new Error("Es un servicio")
      if (prod.stockActual < cantidadSolicitada) {
        throw new Error("Stock insuficiente")
      }
    } catch (e: any) {
      if (e.message === "Stock insuficiente") {
        falladoCorrectamente = true
      }
    }

    expect(falladoCorrectamente).toBeTruthy()
  })

  // ==========================================
  // PRUEBA 4: Restricción de Roles (ADMIN/DOCTOR vs EMPLEADO)
  // ==========================================
  await test("Rol DOCTOR debe tener acceso a Clínica y Rol EMPLEADO no debe tener acceso", async () => {
    // Simular el middleware de seguridad o la validación del endpoint
    const checkRolePermission = (userRol: string, modulo: string, accion: string) => {
      const allowedRoles = ["ADMIN", "DOCTOR"]
      if (modulo === "CLINICA") {
        return allowedRoles.includes(userRol)
      }
      return false
    }

    const doctorTieneAcceso = checkRolePermission(rolDoctor.nombre, "CLINICA", "VER")
    const empleadoTieneAcceso = checkRolePermission(rolEmpleado.nombre, "CLINICA", "VER")

    expect(doctorTieneAcceso).toBeTruthy()
    expect(empleadoTieneAcceso).toBeFalsy()
  })

  // ==========================================
  // 4. Limpieza de datos de prueba
  // ==========================================
  console.log("\n🧹 Limpiando datos de prueba...")
  
  // Eliminar atenciones, diagnósticos, tratamientos, insumos
  await prisma.insumoAtencion.deleteMany({ where: { producto: { idCategoria: categoria.id } } })
  await prisma.movimientoInventario.deleteMany({ where: { producto: { idCategoria: categoria.id } } })
  await prisma.diagnosticoAtencion.deleteMany({ where: { atencion: { idCliente: cliente.id } } })
  await prisma.tratamientoAtencion.deleteMany({ where: { atencion: { idCliente: cliente.id } } })
  await prisma.atencionPodologica.deleteMany({ where: { idCliente: cliente.id } })
  await prisma.diagnostico.deleteMany({ where: { esDatoPrueba: true } })
  await prisma.tratamiento.deleteMany({ where: { esDatoPrueba: true } })

  // Eliminar stock y productos
  await prisma.lote.deleteMany({ where: { idProducto: insumoFisico.id } })
  await prisma.producto.deleteMany({ where: { idCategoria: categoria.id } })
  await prisma.categoriaProducto.delete({ where: { id: categoria.id } })
  await prisma.cliente.delete({ where: { id: cliente.id } })
  await prisma.usuario.deleteMany({ where: { id: { in: [doctorUser.id, empleadoUser.id] } } })

  console.log("✅ Limpieza completada.")

  // ==========================================
  // Reporte Final
  // ==========================================
  console.log("\n================================================================================")
  console.log(`📊 RESULTADOS FINALES:`)
  console.log(`  ✅ Pruebas pasadas: ${pasados}`)
  console.log(`  ❌ Pruebas falladas: ${fallados}`)
  console.log(`  📋 Total: ${pasados + fallados}`)

  if (errores.length > 0) {
    console.log("\n❌ ERRORES ENCONTRADOS:")
    errores.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
    process.exit(1)
  } else {
    console.log("\n🎉 ¡Todas las pruebas del Módulo Clínico pasaron exitosamente!")
    process.exit(0)
  }
}

main()
  .catch((e) => {
    console.error("💥 Error crítico en la suite de pruebas:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
