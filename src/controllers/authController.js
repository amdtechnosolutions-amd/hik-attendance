import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Master from '../models/Master.js';
import Institution from '../models/Institution.js';

// async function login(req, res) {
//   const { emailOrShortName, password } = req.body;

//   // --- Try Master login ---
//   const master = await Master.findOne({ email: emailOrShortName });
//   if (master) {
//     const ok = await bcrypt.compare(password, master.passwordHash);
//     if (!ok) return res.status(401).json({ message: 'Invalid master credentials' });

//     const token = jwt.sign({ masterId: master._id, role: 'master' }, process.env.JWT_SECRET, { expiresIn: '80d' });
//     return res.json({ token, role: 'master', masterId: master._id });
//   }

//   // --- Try Institution login ---
//   const inst = await Institution.findOne({ 
//     $or: [{ email: emailOrShortName }, { shortName: emailOrShortName }]
//   });
//   if (inst) {
//     const ok = await bcrypt.compare(password, inst.passwordHash);
//     if (!ok) return res.status(401).json({ message: 'Invalid institution credentials' });

//     const token = jwt.sign({ institutionId: inst._id, role: 'institution_admin' }, process.env.JWT_SECRET, { expiresIn: '90d' });
//     return res.json({ token, role: 'institution_admin', institutionId: inst._id });
//   }

//   return res.status(404).json({ message: 'User not found' });
// }

async function login(req, res) {
  const { emailOrShortName, email, password } = req.body;
  const identifier = emailOrShortName || email;

  // --- Try Master login ---
  const master = await Master.findOne({ email: identifier });
  if (master) {
    const ok = await bcrypt.compare(password, master.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid master credentials' });

    const token = jwt.sign({ masterId: master._id, role: 'master' }, process.env.JWT_SECRET, { expiresIn: '80d' });
    return res.json({ token, role: 'master', masterId: master._id });
  }

  // --- Try Institution login ---
  const inst = await Institution.findOne({
    $or: [{ email: identifier }, { shortName: identifier }]
  });
  if (inst) {
    const ok = await bcrypt.compare(password, inst.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid institution credentials' });

    const token = jwt.sign({ institutionId: inst._id, role: 'institution_admin' }, process.env.JWT_SECRET, { expiresIn: '90d' });
    return res.json({ 
      token, 
      role: 'institution_admin', 
      institutionId: inst._id,
      institutionName: inst.name,         // Add institution name
      shortName: inst.shortName           // Add institution shortcode
    });
  }

  return res.status(404).json({ message: 'User not found' });
}


export default { login };
