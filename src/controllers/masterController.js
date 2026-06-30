import Master from '../models/Master.js';
import bcrypt from 'bcrypt';


export async function bootstrapMaster(req, res) {
  try {
    const count = await Master.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Master already exists. Use /api/auth/login.' });
    }

    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const hash = await bcrypt.hash(password, 10);
    const master = await Master.create({ email, passwordHash: hash, name, role: 'master' });

    res.json({
      success: true,
      message: 'Master created successfully',
      master: { id: master._id, email: master.email, name: master.name }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
export async function createMaster(req, res) {
  try {
    const { email, password, name } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const master = await Master.create({ email, passwordHash: hash, name });
    res.json(master);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function listMasters(req, res) {
  const masters = await Master.find().select('-passwordHash');
  res.json(masters);
}

export async function updateMaster(req, res) {
  const { id } = req.params;
  const { name, password } = req.body;
  const update = {};
  if (name) update.name = name;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);

  const master = await Master.findByIdAndUpdate(id, update, { new: true }).select('-passwordHash');
  res.json(master);
}

export async function deleteMaster(req, res) {
  const { id } = req.params;
  await Master.findByIdAndDelete(id);
  res.json({ success: true });
}

export default { bootstrapMaster,createMaster, listMasters, updateMaster, deleteMaster };
