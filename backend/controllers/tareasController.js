const admin = require('firebase-admin');
const db = admin.firestore();
const { getStorage } = require('firebase-admin/storage');


const obtenerTareasPorUsuario = async (req, res) => {
    const { email } = req.body;

    try {
        const estudiosRef = db.collection("estudios");
        const snapshot = await estudiosRef.get(); // Obtenemos todos los documentos de la colección

        const tareasUsuario = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const tareas = data.data?.TareasData || []; // Obtenemos las tareas si existen

            // Filtramos las tareas donde el trabajador contenga el email dado
            const tareasFiltradas = tareas.filter(tarea => {
                return tarea.trabajador.split(',').map(e => e.trim()).includes(email);
            });

            // Si encontramos tareas, las agregamos al resultado
            if (tareasFiltradas.length > 0) {
                tareasFiltradas.forEach(tarea => {
                    tareasUsuario.push({
                        estudioId: doc.id,
                        ...tarea // Incluimos los detalles de la tarea
                    });
                });
            }
        });

        res.status(200).json(tareasUsuario); // Retornamos las tareas encontradas

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const transformarGeoJSONAlFormatoOriginal = (geoJson) => {
    if (geoJson.type === "FeatureCollection") {
        return {
            ...geoJson,
            features: geoJson.features.map((feature) => {
                if (feature.geometry && feature.geometry.type === "Polygon") {
                    return {
                        ...feature,
                        geometry: {
                            ...feature.geometry,
                            coordinates: [
                                feature.geometry.coordinates.map(coord => [coord.lng, coord.lat]),
                            ],
                        },
                    };
                }
                return feature;
            }),
        };
    }
    return geoJson;
};

const obtenerEstudiosPorTareasUsuario = async (req, res) => {
    const { email } = req.body;

    try {
        const estudiosRef = db.collection("estudios");
        const snapshot = await estudiosRef.get(); // Obtiene todos los estudios

        const estudiosUsuario = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const tareas = data.data?.TareasData || []; // Obtenemos las tareas del estudio

            // Filtramos las tareas donde el trabajador contenga el email dado
            const usuarioAsignado = tareas.some(tarea => {
                return tarea.trabajador.split(',').map(e => e.trim()).includes(email);
            });

            // Si el usuario tiene tareas asignadas en este estudio, lo añadimos a la respuesta
            if (usuarioAsignado) {
                // Transformar ParcelasData si existe
                if (data.data.ParcelasData) {
                    data.data.ParcelasData = transformarGeoJSONAlFormatoOriginal(data.data.ParcelasData);
                }

                estudiosUsuario.push({ id: doc.id, ...data });
            }
        });

        res.status(200).json(estudiosUsuario); // Retornamos los estudios encontrados

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtiene un estudio por su ID y devuelve solo las tareas asignadas al usuario autenticado.
 */

const obtenerEstudioPorIdParaUsuario = async (req, res) => {
    try {
        const { idEstudio, emailUsuario } = req.body;

        if (!idEstudio || !emailUsuario) {
            return res.status(400).json({ error: "Faltan parámetros: idEstudio y emailUsuario son requeridos." });
        }

        // Obtener el documento del estudio por ID
        const estudioRef = db.collection("estudios").doc(idEstudio);
        const estudioSnap = await estudioRef.get();

        if (!estudioSnap.exists) {
            return res.status(404).json({ error: "Estudio no encontrado." });
        }

        const estudioData = estudioSnap.data();

        if (!estudioData.data) {
            return res.status(500).json({ error: "El estudio no tiene datos asociados." });
        }

        // Filtrar solo las tareas asignadas al usuario
        let tareasFiltradas = [];
        if (Array.isArray(estudioData.data.TareasData)) {
            tareasFiltradas = estudioData.data.TareasData.filter(tarea => {
                const trabajador = tarea.trabajador;

                if (Array.isArray(trabajador)) {
                    return trabajador.map(t => t.toLowerCase().trim()).includes(emailUsuario.toLowerCase().trim());
                }

                if (typeof trabajador === 'string') {
                    return trabajador
                        .split(',')
                        .map(t => t.toLowerCase().trim())
                        .includes(emailUsuario.toLowerCase().trim());
                }

                return false;
            });
        }

        // Construir la respuesta con solo las propiedades necesarias
        const respuesta = {
            NuevoEstudioFormData: estudioData.data.NuevoEstudioFormData || {},
            ParcelasData: estudioData.data.ParcelasData || {},
            resumenFiguras: estudioData.data.resumenFiguras || {},
            TareasData: tareasFiltradas // Solo tareas del usuario
        };

        return res.json(respuesta);
    } catch (error) {
        console.error("Error obteniendo el estudio con tareas filtradas:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};


/**
 * Guarda las URLs de los archivos subidos para una tarea específica en un estudio.
 * Soporta momentos temporales (Pre, Post, 1 año, etc.) y mantiene compatibilidad con tareas sin momentos.
 */
const guardarArchivosTarea = async (req, res) => {
    try {
        const { idEstudio, idTarea, archivos, emailUsuario, momento } = req.body;

        if (!idEstudio || !idTarea || !Array.isArray(archivos) || !emailUsuario) {
            return res.status(400).json({ error: "Faltan parámetros obligatorios." });
        }

        const estudioRef = db.collection("estudios").doc(idEstudio);
        const docSnap = await estudioRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: "Estudio no encontrado." });
        }

        const estudioData = docSnap.data();
        const tareas = estudioData.data?.TareasData || [];

        // Buscar la tarea
        const tarea = tareas.find(t => t.id === idTarea);
        if (!tarea) {
            return res.status(404).json({ error: "Tarea no encontrada." });
        }

        const archivosConUsuario = archivos.map(file => ({
            ...file,
            subidoPor: emailUsuario
        }));

        // 🆕 CASO 1: Tarea CON momentos
        if (momento && tarea.tieneMomentos) {
            console.log(`📁 Guardando archivos en momento: ${momento}`);

            // Validar que el momento existe en la tarea
            if (!tarea.momentos || !tarea.momentos[momento]) {
                return res.status(400).json({ 
                    error: `El momento "${momento}" no existe en esta tarea`,
                    momentosDisponibles: tarea.momentos ? Object.keys(tarea.momentos) : []
                });
            }

            // Inicializar archivosSubidos si no existe
            if (!tarea.momentos[momento].archivosSubidos) {
                tarea.momentos[momento].archivosSubidos = [];
            }

            // Añadir archivos al momento específico
            tarea.momentos[momento].archivosSubidos.push(...archivosConUsuario);
            
            // Actualizar status a completed
            tarea.momentos[momento].status = 'completed';
            tarea.momentos[momento].fechaSubida = new Date().toISOString();

            console.log(`✅ Archivos guardados en momento ${momento}:`, archivos.length);

        // 🔄 CASO 2: Tarea SIN momentos (compatibilidad)
        } else {
            console.log('📁 Guardando archivos en tarea sin momentos');
            
            // Inicializar archivosSubidos si no existe
            if (!Array.isArray(tarea.archivosSubidos)) {
                tarea.archivosSubidos = [];
            }

            // Añadir archivos a la tarea directamente
            tarea.archivosSubidos.push(...archivosConUsuario);

            console.log(`✅ Archivos guardados en tarea:`, archivos.length);
        }

        const updateData = {
            'data.TareasData': tareas,
            'data.subidaDatos.tengoDatosSubidos': true,
            updatedAt: new Date().toISOString(),
        };

        await estudioRef.update(updateData);

        return res.status(200).json({ 
            success: true,
            message: "Archivos guardados correctamente.",
            momento: momento || null,
            archivosGuardados: archivos.length
        });
    } catch (error) {
        console.error("❌ Error al guardar archivos de tarea:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};



/**
 * Elimina un archivo de una tarea.
 * Soporta momentos temporales (Pre, Post, 1 año, etc.) y mantiene compatibilidad con tareas sin momentos.
 */
const eliminarArchivoTarea = async (req, res) => {
    try {
        const { idEstudio, idTarea, nombreArchivo, momento } = req.body;
        const userEmail = req.user.email;

        const estudioRef = db.collection("estudios").doc(idEstudio);
        const docSnap = await estudioRef.get();

        if (!docSnap.exists) return res.status(404).json({ error: "Estudio no encontrado." });

        const estudioData = docSnap.data();
        const tareas = estudioData.data?.TareasData || [];

        // Buscar la tarea
        const tarea = tareas.find(t => t.id === idTarea);
        if (!tarea) {
            return res.status(404).json({ error: "Tarea no encontrada." });
        }

        let archivoEncontrado = false;
        let rutaArchivo = `estudios/${idEstudio}/tareas/${idTarea}`;

        // 🆕 CASO 1: Eliminar de momento específico
        if (momento && tarea.tieneMomentos) {
            console.log(`🗑️ Eliminando archivo de momento: ${momento}`);

            if (!tarea.momentos?.[momento]?.archivosSubidos) {
                return res.status(404).json({ error: "Momento no encontrado" });
            }

            const index = tarea.momentos[momento].archivosSubidos.findIndex(
                archivo => archivo.nombre === nombreArchivo && archivo.subidoPor === userEmail
            );

            if (index === -1) {
                return res.status(403).json({ error: "No tienes permiso para eliminar este archivo o no existe." });
            }

            archivoEncontrado = true;
            tarea.momentos[momento].archivosSubidos.splice(index, 1);

            // Si no quedan archivos, volver a pending
            if (tarea.momentos[momento].archivosSubidos.length === 0) {
                tarea.momentos[momento].status = 'pending';
                delete tarea.momentos[momento].fechaSubida;
            }

            rutaArchivo += `/${momento}/${nombreArchivo}`;
            console.log(`✅ Archivo eliminado de momento ${momento}`);

        // 🔄 CASO 2: Eliminar de archivos generales (compatibilidad)
        } else {
            console.log('🗑️ Eliminando archivo de tarea sin momentos');

            if (!Array.isArray(tarea.archivosSubidos)) {
                return res.status(404).json({ error: "No hay archivos en esta tarea." });
            }

            const index = tarea.archivosSubidos.findIndex(
                archivo => archivo.nombre === nombreArchivo && archivo.subidoPor === userEmail
            );

            if (index === -1) {
                return res.status(403).json({ error: "No tienes permiso para eliminar este archivo o no existe." });
            }

            archivoEncontrado = true;
            tarea.archivosSubidos.splice(index, 1);
            rutaArchivo += `/${nombreArchivo}`;
            console.log(`✅ Archivo eliminado de tarea`);
        }

        // Eliminar archivo del storage
        const storage = getStorage().bucket();
        try {
            await storage.file(rutaArchivo).delete();
        } catch (storageError) {
            console.warn('⚠️ Error al eliminar archivo de storage (puede que ya no exista):', storageError.message);
        }

        // Verificar si aún quedan archivos en alguna tarea
        const hayArchivosEnAlgunaTarea = tareas.some(t => {
            if (Array.isArray(t.archivosSubidos) && t.archivosSubidos.length > 0) {
                return true;
            }
            if (t.momentos) {
                return Object.values(t.momentos).some(m => 
                    Array.isArray(m.archivosSubidos) && m.archivosSubidos.length > 0
                );
            }
            return false;
        });

        // Actualizar la base de datos
        await estudioRef.update({
            'data.TareasData': tareas,
            'data.subidaDatos.tengoDatosSubidos': hayArchivosEnAlgunaTarea,
            updatedAt: new Date().toISOString(),
        });

        return res.status(200).json({ 
            success: true,
            message: "Archivo eliminado correctamente.",
            momento: momento || null
        });

    } catch (error) {
        console.error("❌ Error al eliminar archivo de tarea:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};


/**
 * Lee el contenido de un archivo de una tarea desde Firebase Storage.
 * Soporta momentos temporales (Pre, Post, 1 año, etc.) y mantiene compatibilidad con tareas sin momentos.
 */
const leerArchivoTarea = async (req, res) => {
    try {
        const { idEstudio, idTarea, nombreArchivo, momento } = req.body;

        if (!idEstudio || !idTarea || !nombreArchivo) {
            return res.status(400).json({ error: "Faltan parámetros obligatorios." });
        }

        // Obtener el estudio para validar que el archivo existe en la BD
        const estudioRef = db.collection("estudios").doc(idEstudio);
        const docSnap = await estudioRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: "Estudio no encontrado." });
        }

        const estudioData = docSnap.data();
        const tareas = estudioData.data?.TareasData || [];
        
        // Buscar la tarea
        const tarea = tareas.find(t => t.id === idTarea);
        if (!tarea) {
            return res.status(404).json({ error: "Tarea no encontrada." });
        }

        let archivo = null;
        let filePath = `estudios/${idEstudio}/tareas/${idTarea}`;

        // 🆕 CASO 1: Buscar en momento específico
        if (momento && tarea.tieneMomentos) {
            console.log(`🔍 Buscando archivo en momento: ${momento}`);
            
            if (!tarea.momentos || !tarea.momentos[momento]) {
                return res.status(404).json({ 
                    error: `El momento "${momento}" no existe en esta tarea`,
                    momentosDisponibles: tarea.momentos ? Object.keys(tarea.momentos) : []
                });
            }

            archivo = tarea.momentos[momento]?.archivosSubidos?.find(
                a => a.nombre === nombreArchivo
            );

            filePath += `/${momento}/${nombreArchivo}`;

        // 🔄 CASO 2: Buscar en archivos generales (compatibilidad)
        } else {
            console.log('🔍 Buscando archivo en tarea sin momentos');
            archivo = tarea.archivosSubidos?.find(a => a.nombre === nombreArchivo);
            filePath += `/${nombreArchivo}`;
        }

        // Validar que el archivo existe en la BD
        if (!archivo) {
            return res.status(404).json({ 
                error: 'Archivo no encontrado en la base de datos',
                momento: momento || null
            });
        }

        // Descargar contenido desde Firebase Storage
        const bucket = getStorage().bucket();
        const file = bucket.file(filePath);

        const [contents] = await file.download();
        const contenidoJson = JSON.parse(contents.toString());

        console.log(`✅ Archivo leído correctamente: ${nombreArchivo}`);

        res.status(200).json({ 
            contenido: contenidoJson,
            momento: momento || null,
            nombreArchivo: archivo.nombre
        });
    } catch (error) {
        console.error("❌ Error al leer archivo:", error);
        res.status(500).json({ error: "Error al leer archivo." });
    }
};





module.exports = {
    obtenerTareasPorUsuario, obtenerEstudiosPorTareasUsuario, obtenerEstudioPorIdParaUsuario, guardarArchivosTarea, eliminarArchivoTarea, leerArchivoTarea
};

