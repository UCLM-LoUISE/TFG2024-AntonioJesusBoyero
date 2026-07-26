// controllers/usuariosController.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Controlador para obtener un usuario por correo electrónico usando POST
// lo usamos en el auth para obtener el usuario logado
const obtenerUsuarioPorEmail = async (req, res) => {
  try {
    const { email } = req.body; // Ahora obtenemos el correo desde el cuerpo de la solicitud
    const usuariosRef = db.collection('usuarios');
    const snapshot = await usuariosRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // En este caso, suponemos que el correo es único y solo hay un documento.
    const userData = snapshot.docs[0].data();
    res.status(200).json({ id: snapshot.docs[0].id, ...userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /usuarios/investigadores-mismo-grupo
 * Body: { email: string }
 * Devuelve investigadores del mismo grupo que el usuario (excluyendo al propio usuario).
 * Se usa en la conf del estudio para compartir el estudio con otros investigadores del mismo grupo.
 */
const obtenerInvestigadoresMismoGrupo = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'email_required' });

    // 1) Usuario base para conocer su grupo
    const snapUser = await db.collection('usuarios')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapUser.empty) return res.status(404).json({ ok: false, error: 'user_not_found' });

    const user = snapUser.docs[0].data();
    const grupo = user.grupo || null;
    if (!grupo) return res.status(200).json({ ok: true, data: [] });

    // 2) Investigadores del mismo grupo
    const snap = await db.collection('usuarios')
      .where('grupo', '==', grupo)
      .where('rol', '==', 'investigador')
      .get();

    const investigadores = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => (u.email || '').toLowerCase() !== email); // excluir al propio usuario

    return res.status(200).json({ ok: true, data: investigadores });
  } catch (err) {
    console.error('obtenerInvestigadoresMismoGrupo error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * POST /usuarios/usuarios-mismo-grupo
 * Body: { email: string }
 * Devuelve investigadores + trabajadores del mismo grupo (excluyendo al propio usuario).
 * Se usa al crear tareas dentro de un estudio para asignarlas a trabajadores e investigadores del mismo grupo.
 */
const obtenerUsuariosMismoGrupo = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'email_required' });

    // 1) Usuario base para conocer su grupo
    const snapUser = await db.collection('usuarios')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapUser.empty) return res.status(404).json({ ok: false, error: 'user_not_found' });

    const user = snapUser.docs[0].data();
    const grupo = user.grupo || null;
    if (!grupo) return res.status(200).json({ ok: true, data: [] });

    // 2) Todos los usuarios del mismo grupo con rol investigador o trabajador
    const snap = await db.collection('usuarios')
      .where('grupo', '==', grupo)
      .where('rol', 'in', ['investigador', 'trabajador'])
      .get();

    // ⬅️ Ya NO excluimos al propio usuario
    let usuarios = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // (Opcional) ordenar por nombre y apellidos
    usuarios.sort((a, b) => {
      const an = `${(a.nombre || '').toLowerCase()} ${(a.apellidos || '').toLowerCase()}`;
      const bn = `${(b.nombre || '').toLowerCase()} ${(b.apellidos || '').toLowerCase()}`;
      return an.localeCompare(bn);
    });

    return res.status(200).json({ ok: true, data: usuarios });
  } catch (err) {
    console.error('obtenerUsuariosMismoGrupo error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};


module.exports = { obtenerUsuarioPorEmail, obtenerInvestigadoresMismoGrupo, obtenerUsuariosMismoGrupo };

