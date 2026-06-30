import DigestFetch from 'digest-fetch';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

function buildBaseUrl(device) {
  const port = device.port || 80;
  return `http://${device.ipAddress}:${port}`;
}

export async function addPersonToDevice(device, userPayload) {
  const base = buildBaseUrl(device);
  const client = new DigestFetch(device.username, device.password);

  const res = await client.fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userPayload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Device add failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export function createHikvisionClient(device) {
  return new DigestFetch(device.username, device.password, { algorithm: 'MD5' });
}

export async function fetchEvents(device, startTime, endTime, startPos = 0, maxResults = 30, client = null) {
  if (!client) {
    client = createHikvisionClient(device);
  }

  const url = `http://${device.ipAddress}:${device.port}/ISAPI/AccessControl/AcsEvent?format=json`;

  const body = {
    AcsEventCond: {
      searchID: "0",
      searchResultPosition: startPos,
      maxResults: maxResults,
      "major": 5,
      "minor": 75,
      startTime: startTime.replace(/\+.*$/, ""), // strip timezone
      endTime: endTime.replace(/\+.*$/, "")
    }
  };
  console.log(` Fetching events from ${url} with body:`, body);

  let res;
  try {
    res = await client.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 90000
    });
  } catch (error) {
    console.error(`Error fetching events from device ${device.ipAddress}:${device.port}:`, error);
    throw error;
  }

  if (!res.ok) {
    throw new Error(`Device responded with ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Fetch face images from Hikvision device
 * @param {Object} options - Options for fetching faces
 * @param {string} options.ipAddress - IP address of the Hikvision device
 * @param {number} options.port - Port number of the Hikvision device
 * @param {string} options.username - Username for authentication
 * @param {string} options.password - Password for authentication
 * @param {number} options.maxResults - Maximum number of results per page
 * @param {string} options.faceLibType - Type of face library (default: "blackFD")
 * @param {string} options.FDID - Face library ID (default: "1")
 * @param {boolean} options.useDigestAuth - Whether to use digest authentication (default: true)
 * @returns {Promise<Array>} - Array of all face records
 */
export async function fetchAllFaces(options) {
  const {
    ipAddress = "124.123.64.64",
    port = 33001,
    username = "admin",
    password = "admin12345",
    maxResults = 10,
    faceLibType = "blackFD",
    FDID = "1",
    useDigestAuth = true
  } = options;

  const url = `http://${ipAddress}:${port}/ISAPI/Intelligent/FDLib/FDSearch?format=json`;
  const client = new DigestFetch(username, password, { algorithm: 'MD5' });

  let allFaces = [];
  let position = 0;
  let hasMoreResults = true;

  console.log(`Starting to fetch faces from ${url}`);

  while (hasMoreResults) {
    try {
      const requestBody = {
        searchResultPosition: position,
        maxResults: maxResults,
        faceLibType: faceLibType,
        FDID: FDID
      };

      console.log(`Fetching faces from position ${position}`);

      const response = await client.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        timeout: 30000
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch faces: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (data.responseStatusStrg === "NO MATCH" || data.numOfMatches === 0) {
        console.log('No more faces to fetch');
        hasMoreResults = false;
        break;
      }

      console.log(`Fetched ${data.numOfMatches} faces. Total matches: ${data.totalMatches}`);

      if (data.MatchList && Array.isArray(data.MatchList)) {
        allFaces = [...allFaces, ...data.MatchList];
        position += data.MatchList.length;
      } else {
        console.log('No MatchList found in response');
        hasMoreResults = false;
      }

      // If we've fetched all faces, stop the loop
      if (allFaces.length >= data.totalMatches) {
        hasMoreResults = false;
      }
    } catch (error) {
      console.error('Error fetching faces:', error);
      throw error;
    }
  }

  return allFaces;
}

/**
 * Download a face image from URL and save it to disk
 * @param {string} imageUrl - URL of the face image
 * @param {string} employeeNo - Employee number to use as filename
 * @param {Object} authOptions - Optional authentication options
 * @param {string} authOptions.username - Username for authentication
 * @param {string} authOptions.password - Password for authentication
 * @param {boolean} authOptions.useDigestAuth - Whether to use digest authentication
 * @returns {Promise<string>} - Path to the saved image
 */
export async function downloadFaceImage(imageUrl, employeeNo, authOptions = {}) {
  try {
    // Create directory if it doesn't exist
    const dirPath = path.resolve('public/faces');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Generate filename based on employee number
    const filename = `${employeeNo}.jpg`;
    const filePath = path.join(dirPath, filename);

    console.log(`Downloading face image for employee ${employeeNo} from ${imageUrl}`);

    // Extract authentication options
    const { username = '', password = '', useDigestAuth = false } = authOptions;

    // Download the image using DigestFetch
    let response;
    if (useDigestAuth && username && password) {
      console.log(`Using digest authentication for ${employeeNo}`);
      const client = new DigestFetch(username, password, { algorithm: 'MD5' });
      response = await client.fetch(imageUrl, {
        timeout: 30000
      });
    } else {
      // No auth needed for public URLs
      const client = new DigestFetch('', '', { algorithm: 'MD5' });
      response = await client.fetch(imageUrl, {
        timeout: 30000
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    // Save the image to disk
    await streamPipeline(response.body, fs.createWriteStream(filePath));

    console.log(`Face image saved to ${filePath}`);

    // Return the relative path for storing in the database
    return `/faces/${filename}`;
  } catch (error) {
    console.error(`Error downloading face image for employee ${employeeNo}:`, error);
    throw error;
  }
}
