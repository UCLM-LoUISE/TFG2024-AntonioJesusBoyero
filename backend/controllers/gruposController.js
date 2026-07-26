// controllers/gruposController.js
const admin = require('firebase-admin');
const db = admin.firestore();

/* Helper: slug a partir del nombre (para id estable y único) */
function slugify(str = '') {
    return String(str)
        .normalize('NFKD')               // quita acentos
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')     // separadores
        .replace(/^-+|-+$/g, '')         // bordes
        .substring(0, 120);              // margen de seguridad para IDs
}

/**
 * Crear grupo.
 * Body:
 *  - nombre?: string   (o "name")
 *  - id?: string       (opcional; si no viene, se genera slug(nombre))
 *
 * Reglas:
 *  - Si no viene id y nombre, 400.
 *  - Unicidad por id (doc) y por nombre (consulta) -> 409.
 *  - Crea doc en 'grupos/{id}' con { nombre, memberCount: 0 }.
 *
 * Respuestas:
 *  - 201 { ok:true, id, nombre, memberCount }
 *  - 409 { ok:false, error:'group_already_exists' | 'group_name_already_in_use' }
 *  - 400 { ok:false, error:'missing_nombre' }
 *  - 500 { ok:false, error: message }
 */
const crearGrupo = async (req, res) => {
    try {
        // Acepta "nombre" o "name"
        const nombreRaw = (req.body?.nombre ?? req.body?.name ?? '').trim();
        let idRaw = (req.body?.id ?? '').trim();

        if (!nombreRaw && !idRaw) {
            return res.status(400).json({ ok: false, error: 'missing_nombre' });
        }

        const nombre = nombreRaw || idRaw;
        const id = idRaw || slugify(nombre);

        if (!id) {
            return res.status(400).json({ ok: false, error: 'invalid_id' });
        }

        // 1) Unicidad por ID
        const docRef = db.collection('grupos').doc(id);
        const exists = await docRef.get();
        if (exists.exists) {
            return res.status(409).json({ ok: false, error: 'group_already_exists', id });
        }

        // 2) Unicidad por nombre (evita mismos nombres con IDs distintos)
        const dup = await db.collection('grupos').where('nombre', '==', nombre).limit(1).get();
        if (!dup.empty) {
            return res.status(409).json({ ok: false, error: 'group_name_already_in_use', nombre });
        }

        // 3) Crear documento (sin fechas; solo nombre + contador)
        const payload = {
            nombre,
            memberCount: 0, // contador denormalizado de miembros (útil para UI)
        };

        await docRef.set(payload, { merge: false });

        return res.status(201).json({ ok: true, id, ...payload });
    } catch (error) {
        console.error('crearGrupo error:', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};


/**
 * Listar grupos (POST).
 * Body opcional: { nombre?: string }
 */
const listarGrupos = async (req, res) => {
    try {
        const nombreRaw = (req.body?.nombre || '').trim();

        let query = db.collection('grupos');
        if (nombreRaw) {
            query = query.where('nombre', '==', nombreRaw);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const grupos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json(grupos);
    } catch (error) {
        console.error('listarGrupos error:', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};


/**
 * Borrar grupo por nombre (POST).
 * Body: { nombre: string }
 * - Si existe, pone grupo=null en todos los usuarios con ese grupo.
 * - Luego elimina el documento del grupo.
 * - Devuelve cuántos usuarios fueron actualizados.
 */
const borrarGrupo = async (req, res) => {
    try {
        const nombreRaw = (req.body?.nombre || '').trim();
        if (!nombreRaw) {
            return res.status(400).json({ ok: false, error: 'missing_group_name' });
        }

        // 1) Buscar el grupo por nombre exacto
        const grpSnap = await db.collection('grupos')
            .where('nombre', '==', nombreRaw)
            .limit(1)
            .get();

        if (grpSnap.empty) {
            return res.status(404).json({ ok: false, error: 'group_not_found', nombre: nombreRaw });
        }

        const grpDoc = grpSnap.docs[0];
        const groupId = grpDoc.id;

        // 2) Buscar usuarios que tengan ese grupo
        const usersSnap = await db.collection('usuarios')
            .where('grupo', '==', nombreRaw)
            .get();

        // 3) Actualizar en lotes (máx. 500 por batch)
        const docs = usersSnap.docs;
        let updatedCount = 0;
        const BATCH_SIZE = 500;

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const slice = docs.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            slice.forEach(d => {
                batch.update(d.ref, { grupo: null }); // deja al usuario “sin grupo”
            });
            await batch.commit();
            updatedCount += slice.length;
        }

        // 4) Eliminar el documento del grupo (después de limpiar usuarios)
        await grpDoc.ref.delete();

        return res.status(200).json({
            ok: true,
            id: groupId,
            nombre: nombreRaw,
            usersUpdated: updatedCount
        });
    } catch (error) {
        console.error('borrarGrupo error:', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};


module.exports = {
    crearGrupo,
    listarGrupos,
    borrarGrupo
};
