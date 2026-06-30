import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment';

dotenv.config();

// We need to import processSyncJob and models
// But since this is a scratch script, let's just create a job in the DB
// and then the backend should pick it up or we can run it here.

async function triggerSync() {
  const institutionId = '68e0e148f633a16a99a9df2e';
  const deviceId = '68e0e1d6f633a16a99a9df3b';
  const institutionDBName = 'ves_mncvv';
  
  const uriParts = process.env.MONGO_URI.split('?');
  const baseUrl = uriParts[0].replace(/\/[^/]*$/, `/${institutionDBName}`);
  const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
  const mongoUri = `${baseUrl}${queryParams}`;
  
  try {
    const instConn = await mongoose.createConnection(mongoUri).asPromise();
    console.log(`Connected to institution DB: ${institutionDBName}`);
    
    const startTime = moment().startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    const endTime = moment().endOf('day').format('YYYY-MM-DDTHH:mm:ss');
    
    // Create the job
    const job = {
      institutionId,
      deviceId: new mongoose.Types.ObjectId(deviceId),
      startTime,
      endTime,
      fullSync: false,
      status: 'pending',
      createdAt: new Date()
    };
    
    const result = await instConn.db.collection('syncjobs').insertOne(job);
    console.log('Sync job created:', result.insertedId);
    
    // Now we need to process it. 
    // In the real app, it's processed by setImmediate in attendanceController.
    // Since we are just testing, let's see if the backend picks it up.
    // Actually, I'll just run the processing logic here by importing it.
    
    await instConn.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

triggerSync();
