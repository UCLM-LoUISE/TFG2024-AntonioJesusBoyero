const admin = require('firebase-admin');
const db = admin.firestore();

/* Util: chunk para getUsers (límite 1000 por llamada) */
function chunk(arr, size = 1000) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/**
 * Obtener todos los usuarios excepto los administradores.
 * - Lee Firestore (colección 'usuarios').
 * - Hace join con Auth (getUsers) para obtener disabled => estado real.
 * - Devuelve estado = 'activo' | 'inactivo' derivado de Auth.
 */
const obtenerUsuariosNoAdministradores = async (req, res) => {
    try {
        const snapshot = await db
            .collection('usuarios')
            .where('rol', '!=', 'administrador')
            .get();

        if (snapshot.empty) return res.status(200).json([]);

        // Datos Firestore
        const usuariosFS = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // UIDs para consultar en Auth
        const uids = usuariosFS
            .map(u => u.uid || u.id)
            .filter(Boolean);

        // Mapa uid -> disabled (desde Auth)
        const authDisabledByUid = {};

        for (const group of chunk(uids, 1000)) {
            const { users } = await admin.auth().getUsers(group.map(uid => ({ uid })));
            for (const u of users) authDisabledByUid[u.uid] = !!u.disabled;
        }

        // Respuesta con estado derivado de Auth (no Firestore)
        const usuarios = usuariosFS.map(u => {
            const uid = u.uid || u.id;
            const disabled = uid in authDisabledByUid ? authDisabledByUid[uid] : false; // si no aparece, asumimos activo
            const estado = disabled ? 'inactivo' : 'activo';
            return { ...u, estado };
        });

        return res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Crea (o asegura) un usuario en Auth y lo guarda en Firestore.
 * IMPORTANTE: ya NO guardamos 'estado' en Firestore.
 * El estado se deriva siempre de Auth.disabled.
 */
const crearUsuario = async (req, res) => {
    try {
        const emailRaw = (req.body?.email || '').trim();
        const email = emailRaw.toLowerCase();

        const {
            nombre,
            apellidos,
            telefono = '',
            rol = 'investigador',
            grupo = null,
        } = req.body || {};

        if (!email || !nombre || !apellidos || !rol) {
            return res.status(400).json({ ok: false, error: 'missing_fields' });
        }

        // Unicidad en Firestore
        const dup = await db.collection('usuarios').where('email', '==', email).limit(1).get();
        if (!dup.empty) {
            return res.status(409).json({ ok: false, error: 'email_already_in_use' });
        }

        // Auth: si existe -> conflicto; si no, crear
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
            return res.status(409).json({ ok: false, error: 'email_already_in_use_auth' });
        } catch {
            // Puedes poner disabled: true si quieres que nazca inactivo en Auth.
            userRecord = await admin.auth().createUser({
                email,
                emailVerified: false,
                disabled: false, // ⬅️ cámbialo a true si quieres nacer inactivo en Auth
            });
        }
        const uid = userRecord.uid;

        // Alta en Firestore (SIN campo 'estado')
        await db.collection('usuarios').doc(uid).set(
            {
                uid,
                email,
                nombre,
                apellidos,
                telefono,
                rol,
                grupo: grupo || null,
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: false },
        );

        // Estado derivado de Auth
        const estado = userRecord.disabled ? 'inactivo' : 'activo';

        return res.status(201).json({ ok: true, uid, estado });
    } catch (error) {
        console.error('crearUsuario error:', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * Activar/Desactivar en Auth (no tocamos Firestore).
 * Body: { uid?: string, email?: string, activo: boolean }
 * - Si viene email, resolvemos uid desde Firestore.
 * - Escribe en Auth: disabled = !activo
 * - Devuelve estado actual.
 */
const actualizarEstadoAuth = async (req, res) => {
    try {
        let { uid, email, activo } = req.body || {};
        if (typeof activo !== 'boolean') {
            return res.status(400).json({ ok: false, error: 'missing_activo_boolean' });
        }

        email = (email || '').trim().toLowerCase();

        if (!uid && !email) {
            return res.status(400).json({ ok: false, error: 'missing_uid_or_email' });
        }

        if (!uid && email) {
            const snap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
            if (snap.empty) return res.status(404).json({ ok: false, error: 'user_not_found_firestore' });
            const doc = snap.docs[0];
            const data = doc.data() || {};
            uid = data.uid || doc.id;
        }

        const disabled = !activo;
        const updated = await admin.auth().updateUser(uid, { disabled });

        return res.status(200).json({
            ok: true,
            uid,
            email: updated.email,
            estado: updated.disabled ? 'inactivo' : 'activo',
        });
    } catch (error) {
        console.error('actualizarEstadoAuth error:', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * Elimina un usuario en Firebase Auth y su doc en Firestore.
 * Body: { email?: string, uid?: string }
 */
const eliminarUsuario = async (req, res) => {
    try {
        let { email, uid } = req.body || {};
        email = (email || '').trim().toLowerCase();

        if (!uid && !email) {
            return res.status(400).json({ ok: false, error: 'missing_uid_or_email' });
        }

        // Resolver doc/uid desde email si hace falta
        let docRef = null;
        if (!uid && email) {
            const snap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
            if (snap.empty) return res.status(404).json({ ok: false, error: 'user_not_found_firestore' });
            const doc = snap.docs[0];
            docRef = doc.ref;
            const data = doc.data();
            uid = data.uid || doc.id;
        } else {
            docRef = db.collection('usuarios').doc(uid);
        }

        // Borrar en Auth (idempotente)
        try {
            await admin.auth().deleteUser(uid);
        } catch (e) {
            if (e?.errorInfo?.code !== 'auth/user-not-found') {
                console.warn('deleteUser warning:', e.message);
            }
        }

        // Borrar documento FS (idempotente)
        try {
            await docRef.delete();
        } catch (e) {
            console.warn('Firestore delete warning:', e.message);
        }

        return res.status(200).json({ ok: true, uid, email });
    } catch (e) {
        console.error('eliminarUsuario error:', e);
        return res.status(500).json({ ok: false, error: e.message });
    }
};

module.exports = {
    obtenerUsuariosNoAdministradores,
    crearUsuario,
    actualizarEstadoAuth,
    eliminarUsuario,
};
