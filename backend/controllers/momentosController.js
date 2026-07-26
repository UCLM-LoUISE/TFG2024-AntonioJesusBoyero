const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * 🔍 VERIFICAR MOMENTOS EN TAREAS
 * Comprueba si hay tareas que usan los momentos que se van a eliminar
 * Se usa ANTES de actualizar para mostrar un modal de advertencia
 * 
 * CASOS DE USO:
 * 1. Desmarcar checkbox (tieneMomentos: false) - Elimina TODOS los momentos
 * 2. Eliminar momento específico (momentoAEliminar: "Momento 1")
 */
const verificarMomentosEnTareas = async (req, res) => {
  try {
    const { id, tieneMomentos, momentoAEliminar } = req.body;

    if (!id) {
      return res.status(400).json({ 
        error: "El ID del estudio es requerido" 
      });
    }

    const estudioDoc = db.collection('estudios').doc(id);
    const estudioSnapshot = await estudioDoc.get();

    if (!estudioSnapshot.exists) {
      return res.status(404).json({ 
        error: "Estudio no encontrado" 
      });
    }

    const estudioData = estudioSnapshot.data();
    const momentosActuales = estudioData.data?.NuevoEstudioFormData?.momentos || [];
    const tieneMomentosActual = estudioData.data?.NuevoEstudioFormData?.tieneMomentos || false;
    const tareasActuales = estudioData.data?.TareasData || [];

    let momentosAEliminar = [];
    let desactivarTodosMomentos = false;
    let tipoAccion = '';

    // 🔴 CASO 1: Usuario desmarca el checkbox (desactivar TODOS los momentos)
    if (tieneMomentos === false && tieneMomentosActual === true) {
      desactivarTodosMomentos = true;
      momentosAEliminar = momentosActuales;
      tipoAccion = 'desmarcar_checkbox';
      
      console.log('🔴 CASO: Desmarcar checkbox - Se eliminarán todos los momentos:', momentosActuales);
    } 
    // 🔵 CASO 2: Usuario elimina un momento específico de la lista
    else if (momentoAEliminar) {
      // Verificar que el momento existe en el estudio
      if (!momentosActuales.includes(momentoAEliminar)) {
        return res.status(400).json({
          error: `El momento "${momentoAEliminar}" no existe en este estudio`
        });
      }
      
      momentosAEliminar = [momentoAEliminar];
      tipoAccion = 'eliminar_momento_especifico';
      
      console.log('🔵 CASO: Eliminar momento específico:', momentoAEliminar);
    } 
    // ⚠️ CASO INVÁLIDO: Falta información
    else {
      return res.status(400).json({
        error: "Debes especificar 'tieneMomentos: false' o 'momentoAEliminar'"
      });
    }

    // Si no hay momentos a eliminar, no continuar
    if (momentosAEliminar.length === 0) {
      return res.status(400).json({
        error: "No hay momentos a eliminar"
      });
    }

    // 📊 Buscar tareas que usan esos momentos
    const tareasAfectadas = [];
    let totalTareasConMomentos = 0;
    
    tareasActuales.forEach(tarea => {
      if (!tarea.tieneMomentos || !tarea.momentos) {
        return; // Esta tarea no tiene momentos
      }

      totalTareasConMomentos++;

      const momentosDeLaTarea = Object.keys(tarea.momentos);
      const momentosQueSePerderan = momentosDeLaTarea.filter(
        m => momentosAEliminar.includes(m)
      );

      if (momentosQueSePerderan.length > 0) {
        tareasAfectadas.push({
          tareaId: tarea.id,
          nombreTarea: tarea.nombreTarea,
          zona: tarea.zona || 'Sin zona',
          trabajador: tarea.trabajador || 'Sin asignar',
          momentosQueSePerderan: momentosQueSePerderan,
          totalMomentosActuales: momentosDeLaTarea.length,
          quedaSinMomentos: momentosQueSePerderan.length === momentosDeLaTarea.length
        });
      }
    });

    const hayTareasAfectadas = tareasAfectadas.length > 0;

    // 📝 Construir mensaje específico según el caso
    let mensajeModal = '';
    let tituloModal = '';
    
    if (desactivarTodosMomentos) {
      // CASO 1: Desmarcar checkbox
      tituloModal = '¿Desactivar fases temporales?';
      
      if (hayTareasAfectadas) {
        mensajeModal = `Al desmarcar esta opción se eliminarán todos los momentos del estudio (${momentosAEliminar.join(', ')}).\n\n` +
                      `Esto afectará a ${tareasAfectadas.length} tarea(s) que quedarán sin momentos asignados.\n\n` +
                      `¿Estás seguro de continuar?`;
      } else if (totalTareasConMomentos === 0) {
        mensajeModal = `Al desmarcar esta opción se eliminarán los momentos: ${momentosAEliminar.join(', ')}.\n\n` +
                      `No hay tareas creadas aún, por lo que no se verán afectadas.\n\n` +
                      `¿Estás seguro de desmarcar esta opción?`;
      } else {
        mensajeModal = `Al desmarcar esta opción se eliminarán los momentos: ${momentosAEliminar.join(', ')}.\n\n` +
                      `Las tareas existentes no tienen momentos asignados, por lo que no se verán afectadas.\n\n` +
                      `¿Estás seguro de desmarcar esta opción?`;
      }
    } else {
      // CASO 2: Eliminar momento específico
      tituloModal = '¿Eliminar momento?';
      
      if (hayTareasAfectadas) {
        mensajeModal = `Al eliminar "${momentoAEliminar}" se afectarán ${tareasAfectadas.length} tarea(s) que tienen este momento asignado.\n\n` +
                      `Estas tareas ${tareasAfectadas.some(t => t.quedaSinMomentos) ? 'quedarán sin momentos' : 'perderán este momento'}.\n\n` +
                      `¿Estás seguro de eliminar "${momentoAEliminar}"?`;
      } else {
        mensajeModal = `¿Estás seguro de eliminar el momento "${momentoAEliminar}" de la lista?\n\n` +
                      `No hay tareas que utilicen este momento, por lo que no se verán afectadas.`;
      }
    }

    // ✅ Respuesta con toda la información necesaria para el modal
    return res.status(200).json({
      hayTareasAfectadas,
      tipoAccion,
      desactivarTodosMomentos,
      momentosAEliminar,
      tareasAfectadas,
      totalTareasAfectadas: tareasAfectadas.length,
      totalTareasConMomentos,
      tituloModal,
      mensajeModal,
      // Información adicional para debugging
      estudioInfo: {
        momentosActuales,
        tieneMomentos: tieneMomentosActual,
        totalTareas: tareasActuales.length
      }
    });

  } catch (error) {
    console.error("Error al verificar momentos en tareas:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 🔄 LIMPIAR TAREAS HUÉRFANAS
 * Elimina momentos de las tareas que ya no existen en el estudio
 * Se ejecuta DESPUÉS de que el usuario confirme la acción
 * 
 * IMPORTANTE: Este controlador SOLO limpia tareas, NO actualiza el formulario.
 * El formulario se actualiza con el endpoint principal de guardar estudio.
 * 
 * CASOS DE USO:
 * 1. Desmarcar checkbox (tieneMomentos: false) - Elimina momentos de TODAS las tareas
 * 2. Eliminar momento específico (momentoAEliminar: "Momento 1") - Elimina ese momento de las tareas
 */
const actualizarMomentosYTareas = async (req, res) => {
  try {
    const { id, tieneMomentos, momentoAEliminar } = req.body;

    if (!id) {
      return res.status(400).json({ 
        error: "El ID del estudio es requerido" 
      });
    }

    const estudioDoc = db.collection('estudios').doc(id);
    const estudioSnapshot = await estudioDoc.get();

    if (!estudioSnapshot.exists) {
      return res.status(404).json({ 
        error: "Estudio no encontrado" 
      });
    }

    let estudioData = estudioSnapshot.data();
    const momentosActuales = estudioData.data?.NuevoEstudioFormData?.momentos || [];
    const tieneMomentosActual = estudioData.data?.NuevoEstudioFormData?.tieneMomentos || false;
    const tareasActuales = estudioData.data?.TareasData || [];

    let momentosAEliminar = [];
    let desactivoMomentos = false;
    let tipoAccion = '';

    // 🔴 CASO 1: Usuario desmarcó el checkbox (eliminar TODOS los momentos de las tareas)
    if (tieneMomentos === false && tieneMomentosActual === true) {
      desactivoMomentos = true;
      momentosAEliminar = momentosActuales;
      tipoAccion = 'desmarcar_checkbox';
      
      console.log('🔴 CASO: Limpiar todos los momentos de las tareas');
    } 
    // 🔵 CASO 2: Usuario eliminó un momento específico
    else if (momentoAEliminar) {
      momentosAEliminar = [momentoAEliminar];
      tipoAccion = 'eliminar_momento_especifico';
      
      console.log('🔵 CASO: Eliminar momento específico de las tareas:', momentoAEliminar);
    }
    // ⚠️ CASO INVÁLIDO
    else {
      return res.status(400).json({
        error: "Debes especificar 'tieneMomentos: false' o 'momentoAEliminar'"
      });
    }

    // 📊 Limpiar momentos de las tareas
    const tareasActualizadas = [];
    let contadorTareasModificadas = 0;

    const tareasModificadas = tareasActuales.map(tarea => {
      if (!tarea.tieneMomentos || !tarea.momentos) {
        return tarea; // No tiene momentos, no modificar
      }

      const momentosOriginales = Object.keys(tarea.momentos);
      const momentosEliminadosDeTarea = [];

      // 🔴 CASO 1: Eliminar TODOS los momentos
      if (desactivoMomentos) {
        contadorTareasModificadas++;
        tareasActualizadas.push({
          tareaId: tarea.id,
          nombreTarea: tarea.nombreTarea,
          momentosEliminados: momentosOriginales
        });
        
        return {
          ...tarea,
          tieneMomentos: false,
          momentos: {}
        };
      }

      // 🔵 CASO 2: Eliminar momento específico
      const nuevosMomentosTarea = {};
      let huboEliminacion = false;

      momentosOriginales.forEach(momento => {
        if (momentosAEliminar.includes(momento)) {
          // Este momento fue eliminado, no conservarlo
          momentosEliminadosDeTarea.push(momento);
          huboEliminacion = true;
        } else {
          // Conservar el momento
          nuevosMomentosTarea[momento] = tarea.momentos[momento];
        }
      });

      // Si la tarea perdió momentos, registrarla
      if (huboEliminacion) {
        contadorTareasModificadas++;
        tareasActualizadas.push({
          tareaId: tarea.id,
          nombreTarea: tarea.nombreTarea,
          momentosEliminados: momentosEliminadosDeTarea
        });
      }

      // Si la tarea se quedó sin ningún momento
      const tieneMomentosDespues = Object.keys(nuevosMomentosTarea).length > 0;

      return {
        ...tarea,
        tieneMomentos: tieneMomentosDespues,
        momentos: nuevosMomentosTarea
      };
    });

    // 💾 Preparar actualización del formulario Y las tareas
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    // 🔴 CASO 1: Desmarcar checkbox - Actualizar formulario
    if (desactivoMomentos) {
      updateData['data.NuevoEstudioFormData.tieneMomentos'] = false;
      updateData['data.NuevoEstudioFormData.momentos'] = [];
    }
    // 🔵 CASO 2: Eliminar momento específico - Actualizar lista de momentos
    else if (momentoAEliminar) {
      const nuevosMomentos = momentosActuales.filter(m => m !== momentoAEliminar);
      updateData['data.NuevoEstudioFormData.momentos'] = nuevosMomentos;
    }

    // Actualizar tareas solo si hubo cambios
    if (contadorTareasModificadas > 0) {
      updateData['data.TareasData'] = tareasModificadas;
    }

    await estudioDoc.update(updateData);

    console.log('✅ Tareas limpiadas. Tareas modificadas:', contadorTareasModificadas);

    return res.status(200).json({
      success: true,
      message: "Tareas actualizadas correctamente",
      estudioId: id,
      momentosInfo: {
        momentosEliminados: momentosAEliminar,
        tareasActualizadas: contadorTareasModificadas,
        detallesTareas: tareasActualizadas
      }
    });

  } catch (error) {
    console.error("Error al limpiar tareas:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  verificarMomentosEnTareas,
  actualizarMomentosYTareas
};
