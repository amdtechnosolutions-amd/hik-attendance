import Device from '../models/Device.js';

async function createDevice(req, res) {
  const { institutionId } = req.params;
  try {
    // Use institution-specific database models
    const { models } = req.institutionDb;
    
    // Create device in institution-specific database
    const device = await models.Device.create({ 
      institutionId, 
      ...req.body 
    });
    
    res.json(device);
  } catch (err) {
    console.error('Error creating device:', err);
    res.status(500).json({ message: err.message });
  }
}

async function listDevices(req, res) {
  const { institutionId } = req.params;
  try {
    const { models } = req.institutionDb;

    // Query devices from the institution-specific database
    const devices = await models.Device.find({ institutionId });

    res.json({
      success: true,
      message: 'Devices retrieved successfully',
      devices: devices
    });
  } catch (err) {
    console.error('Error listing devices:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve devices: ' + err.message
    });
  }
}


export default { createDevice, listDevices };