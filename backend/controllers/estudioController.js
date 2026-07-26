const admin = require('firebase-admin');
const db = admin.firestore();

const crearEstudio = async (req, res) => {
  try {
    const { email, ...estudioData } = req.body; // Recibir el email y los datos del estudio
    const newEstudioRef = db.collection('estudios').doc();
    await newEstudioRef.set({ email, ...estudioData }); // Guardar el estudio junto con el email del usuario
    res.status(201).json({ id: newEstudioRef.id, email, ...estudioData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerEstudiosPorUsuario = async (req, res) => {
  const { email } = req.body;

  try {
    const estudiosRef = db.collection("estudios");
    const snapshot = await estudiosRef.where("email", "array-contains", email).get();

    const estudios = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Transformar ParcelasData al formato original
      if (data.data.ParcelasData) {
        data.data.ParcelasData = transformarGeoJSONAlFormatoOriginal(data.data.ParcelasData);
      }

      return { id: doc.id, ...data };
    });

    res.status(200).json(estudios);
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


const eliminarEstudio = async (req, res) => {
  try {
    const { id } = req.body; // Recibir el ID del estudio que deseas eliminar
    const estudioRef = db.collection('estudios').doc(id);

    // Verificar si el documento existe
    const estudioSnapshot = await estudioRef.get();
    if (!estudioSnapshot.exists) {
      return res.status(404).json({ message: 'El estudio no existe' });
    }

    // Obtener los datos del estudio
    const estudioData = estudioSnapshot.data();

    // Verificar el estado del estudio
    if (estudioData.data.NuevoEstudioFormData.estado !== 'Sin empezar' && estudioData.data.NuevoEstudioFormData.estado !== 'Borrador') {
      return res.status(400).json({
        message: `No se puede eliminar el estudio porque está en estado "${estudioData.data.NuevoEstudioFormData.estado}".`
      });
    }

    // Eliminar el documento
    await estudioRef.delete();
    res.status(200).json({ message: `Estudio con ID ${id} eliminado correctamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const guardarEstudio = async (req, res) => {
  try {
    const { id, email, data, step } = req.body;
    const idFormulario = data?.idFormulario;

    const estudiosRef = db.collection('estudios');

    console.log('Request body:', req.body);
    console.log('idFormulario extraído:', idFormulario);

    // Caso: Buscar por idFormulario
    if (!id) {
      if (idFormulario) {
        const querySnapshot = await estudiosRef
          .where("data.NuevoEstudioFormData.idFormulario", "==", idFormulario)
          .get();

        console.log('querySnapshot size:', querySnapshot.size);
        console.log('querySnapshot docs:', querySnapshot.docs.map(doc => doc.data()));

        if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          const estudioDoc = estudiosRef.doc(existingDoc.id);

          const updateData = {
            updatedAt: new Date().toISOString(),
          };
          if (step) updateData[`data.${step}`] = data;

          await estudioDoc.update(updateData);

          return res.status(200).json({
            id: existingDoc.id,
            message: "Estudio actualizado con idFormulario.",
          });
        } else {
          console.log(`No se encontró un estudio con idFormulario: ${idFormulario}`);
        }
      }

      // Si no existe un estudio con el mismo idFormulario, crear uno nuevo
      const newDocRef = estudiosRef.doc();
      await newDocRef.set({
        email: [email],
        data: {
          ...(step ? { [step]: data } : {}),
          subidaDatos: {
            tengoDatosSubidos: false, // ✅ Campo nuevo por defecto
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return res.status(201).json({
        id: newDocRef.id,
        message: "Estudio creado.",
      });
    } else {
      // Actualizar estudio existente por ID
      const estudioDoc = estudiosRef.doc(id);
      const estudioSnapshot = await estudioDoc.get();

      if (!estudioSnapshot.exists) {
        return res.status(404).json({ message: "Estudio no encontrado." });
      }

      let estudioData = estudioSnapshot.data();
      if (estudioData.email && !Array.isArray(estudioData.email)) {
        estudioData.email = [estudioData.email];
      }

      const updateData = {
        updatedAt: new Date().toISOString(),
      };
      if (step) updateData[`data.${step}`] = data;

      await estudioDoc.update(updateData);

      return res.status(200).json({ id, message: "Estudio actualizado." });
    }
  } catch (error) {
    console.error("Error al guardar el estudio:", error);
    res.status(500).json({ error: error.message });
  }
};

const transformarGeoJSON = (geoJson) => {
  if (geoJson.type === "FeatureCollection") {
    return {
      ...geoJson,
      features: geoJson.features.map((feature) => {
        if (feature.geometry) {
          if (feature.geometry.type === "Polygon") {
            return {
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: feature.geometry.coordinates[0].map(([lng, lat]) => ({
                  lat,
                  lng,
                })),
              },
            };
          } else if (feature.geometry.type === "LineString") {
            return {
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: feature.geometry.coordinates.map(([lng, lat]) => ({
                  lat,
                  lng,
                })),
              },
            };
          }
        }
        return feature;
      }),
    };
  }
  return geoJson;
};


const guardarEstudioZonas = async (req, res) => {
  try {
    const { email, data, step, idFormulario, resumenFiguras } = req.body;
    const estudiosRef = db.collection("estudios");

    console.log("Request body:", req.body);
    console.log("idFormulario extraído:", idFormulario);

    if (idFormulario) {
      const querySnapshot = await estudiosRef
        .where("data.NuevoEstudioFormData.idFormulario", "==", idFormulario)
        .get();

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const estudioDoc = estudiosRef.doc(existingDoc.id);

        // Transformar las coordenadas
        const dataTransformada = transformarGeoJSON(data);

        const updateData = {
          [`data.${step}`]: dataTransformada,
          updatedAt: new Date().toISOString(),
        };

        await estudioDoc.update(updateData);

        return res.status(200).json({
          id: existingDoc.id,
          message: "Zonas actualizadas en el estudio.",
        });
      } else {
        console.log(
          `No se encontró un estudio con idFormulario: ${idFormulario}`
        );
        return res
          .status(404)
          .json({ message: "Estudio no encontrado con ese idFormulario." });
      }
    } else {
      console.error("idFormulario no proporcionado.");
      return res
        .status(400)
        .json({ message: "Solicitud no válida: falta idFormulario." });
    }
  } catch (error) {
    console.error("Error al guardar las zonas:", error);
    res.status(500).json({ error: error.message });
  }
};

const guardarEstudioZonasNuevo = async (req, res) => {
  try {
    const { email, data, step, idFormulario, resumenFiguras } = req.body; // Se añade resumenFiguras
    const estudiosRef = db.collection("estudios");

    console.log("Request body:", req.body);
    console.log("idFormulario extraído:", idFormulario);

    if (idFormulario) {
      const querySnapshot = await estudiosRef
        .where("data.NuevoEstudioFormData.idFormulario", "==", idFormulario)
        .get();

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const estudioDoc = estudiosRef.doc(existingDoc.id);

        // Obtener datos actuales
        let estudioData = existingDoc.data();

        // 🔹 Si el campo email existe y no es un array, lo convertimos en array
        if (estudioData.email && !Array.isArray(estudioData.email)) {
          estudioData.email = [estudioData.email];
        }

        // Transformar las coordenadas
        const dataTransformada = transformarGeoJSON(data);

        // Preparamos los datos a actualizar
        const updateData = {
          [`data.${step}`]: dataTransformada,
          updatedAt: new Date().toISOString(),
        };

        // Si resumenFiguras existe, lo añadimos al objeto de actualización
        if (resumenFiguras) {
          updateData[`data.resumenFiguras`] = resumenFiguras;
        }

        // Actualizamos el documento en Firestore
        await estudioDoc.update(updateData);

        return res.status(200).json({
          id: existingDoc.id,
          message: "Zonas y resumen de figuras actualizados en el estudio.",
        });
      } else {
        console.log(
          `No se encontró un estudio con idFormulario: ${idFormulario}`
        );
        return res
          .status(404)
          .json({ message: "Estudio no encontrado con ese idFormulario." });
      }
    } else {
      console.error("idFormulario no proporcionado.");
      return res
        .status(400)
        .json({ message: "Solicitud no válida: falta idFormulario." });
    }
  } catch (error) {
    console.error("Error al guardar las zonas:", error);
    res.status(500).json({ error: error.message });
  }
};

const guardarEstudioTareas = async (req, res) => {
  try {
    const { email, data, step, idFormulario } = req.body; // Extraer datos del payload
    const estudiosRef = db.collection('estudios');

    console.log('Request body:', req.body);
    console.log('idFormulario extraído:', idFormulario);

    if (idFormulario) {
      // Buscar un estudio que tenga este idFormulario
      const querySnapshot = await estudiosRef
        .where("data.NuevoEstudioFormData.idFormulario", "==", idFormulario)
        .get();

      if (!querySnapshot.empty) {
        // Si se encuentra un estudio con el idFormulario, actualizarlo
        const existingDoc = querySnapshot.docs[0];
        const estudioDoc = estudiosRef.doc(existingDoc.id);

        // Obtener datos actuales del estudio
        let estudioData = existingDoc.data();

        // 🔹 Si el campo email existe y no es un array, lo convertimos en array
        if (estudioData.email && !Array.isArray(estudioData.email)) {
          estudioData.email = [estudioData.email];
        }

        // Verificar que el usuario que está actualizando tiene permisos
        if (!estudioData.email.includes(email)) {
          return res.status(403).json({ message: "No tienes permisos para modificar este estudio." });
        }

        // Actualizar la parte correspondiente (en este caso, las tareas)
        const updateData = {
          [`data.${step}`]: data, // Guardar las tareas bajo el paso `tareas`
          updatedAt: new Date().toISOString(), // Actualizar la fecha de modificación
        };

        await estudioDoc.update(updateData);

        return res.status(200).json({
          id: existingDoc.id,
          message: "Tareas actualizadas en el estudio.",
        });
      } else {
        console.log(`No se encontró un estudio con idFormulario: ${idFormulario}`);
        return res.status(404).json({ message: "Estudio no encontrado con ese idFormulario." });
      }
    } else {
      console.error("idFormulario no proporcionado.");
      return res.status(400).json({ message: "Solicitud no válida: falta idFormulario." });
    }
  } catch (error) {
    console.error("Error al guardar las tareas:", error);
    res.status(500).json({ error: error.message });
  }
};

const cambiarEstadoEstudio = async (req, res) => {
  try {
    const { id, idFormulario, nuevoEstado } = req.body;

    if (!id && !idFormulario) {
      return res.status(400).json({ message: "Debe proporcionar id o idFormulario." });
    }

    const estudiosRef = db.collection('estudios');
    let estudioDoc;

    if (id) {
      // Buscar por ID del estudio
      estudioDoc = estudiosRef.doc(id);
    } else if (idFormulario) {
      // Buscar por idFormulario
      const querySnapshot = await estudiosRef
        .where("data.NuevoEstudioFormData.idFormulario", "==", idFormulario)
        .get();

      if (!querySnapshot.empty) {
        estudioDoc = estudiosRef.doc(querySnapshot.docs[0].id);
      } else {
        console.log(`No se encontró un estudio con idFormulario: ${idFormulario}`);
        return res.status(404).json({ message: "Estudio no encontrado con ese idFormulario." });
      }
    }

    if (!estudioDoc) {
      return res.status(404).json({ message: "Estudio no encontrado." });
    }

    // Actualizar el estado dentro de `data.NuevoEstudioFormData`
    const updateData = {
      "data.NuevoEstudioFormData.estado": nuevoEstado,
      updatedAt: new Date().toISOString(),
    };

    await estudioDoc.update(updateData);

    return res.status(200).json({
      id: estudioDoc.id,
      message: `Estado del estudio actualizado a ${nuevoEstado}.`,
    });
  } catch (error) {
    console.error("Error al cambiar el estado del estudio:", error);
    res.status(500).json({ error: error.message });
  }
};


const actualizarPermisosEstudio = async (req, res) => {
  try {
    const { idEstudio, emailUser, emails } = req.body;

    if (!idEstudio || !emails) {
      return res.status(400).json({ message: "Faltan parámetros" });
    }

    const estudioRef = db.collection('estudios').doc(idEstudio);
    const estudioSnap = await estudioRef.get();

    if (!estudioSnap.exists) {
      return res.status(404).json({ message: "Estudio no encontrado" });
    }

    const emailsAntiguos = estudioSnap.data().email || [];
    const usuarioCreador = emailsAntiguos[0];

    if (emailUser !== usuarioCreador) {
      return res.status(403).json({ message: "No tienes permiso para modificar este estudio." });
    }

    const nuevosUsuarios = emails.filter(email => !emailsAntiguos.includes(email));

    const emailsActualizados = [usuarioCreador, ...emails.filter(e => e !== usuarioCreador)];

    await estudioRef.update({
      email: emailsActualizados,
      updatedAt: new Date().toISOString()
    });

    // 🔹 Enviar correos a los nuevos usuarios (solo si hay nuevos)
    // if (nuevosUsuarios.length > 0) {
    //   const estudioNombre = estudioSnap.data().data?.NuevoEstudioFormData?.nombreEstudio || 'un estudio';

    //   try {
    //     await Promise.all(
    //       nuevosUsuarios.map(email => enviarCorreoConfiguracion(email, estudioNombre))
    //     );
    //   } catch (error) {
    //     console.error("❌ Error al enviar correos:", error);
    //   }
    // }

    return res.status(200).json({ message: "Permisos actualizados correctamente", email: emailsActualizados });

  } catch (error) {
    console.error("Error al actualizar permisos:", error);
    return res.status(500).json({ error: error.message });
  }
};

// REVISAR EL ERROR AL MANDAR EL CORREO




const descargarEstudioPorId = async (req, res) => {
  const { id } = req.body;

  try {
    const docRef = db.collection("estudios").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Estudio no encontrado" });
    }

    const data = doc.data();
    res.setHeader('Content-Disposition', `attachment; filename=estudio-${id}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ id, ...data }, null, 2));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};






module.exports = {
  crearEstudio, obtenerEstudiosPorUsuario, eliminarEstudio, guardarEstudio,
  guardarEstudioZonas, guardarEstudioTareas, cambiarEstadoEstudio, guardarEstudioZonasNuevo,
  actualizarPermisosEstudio, descargarEstudioPorId
};
