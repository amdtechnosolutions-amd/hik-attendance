import DigestFetch from 'digest-fetch';
import { formatISAPITime } from '../utils/timeUtil.js';
import User from '../models/User.js';
// Configure client with device username/password
const client = new DigestFetch('admin', 'Amd@737373');


// Function to add person to ISAPI device
// Function to add person to ISAPI device
async function addPersonToDevice(device, payload) {
  const { ip, username, password } = device; // device details
  const url = `http://${ip}/ISAPI/AccessControl/UserInfo/Record?format=json`;

  // Use the correct password format for admin account
  let correctedPassword = password;
  if (username === 'admin' && password.toLowerCase() === 'amd@737373') {
    correctedPassword = 'Amd@737373';
    console.log('Correcting password capitalization for admin account');
  }

  const client = new DigestFetch(username, correctedPassword);

  const res = await client.fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  return text; // raw XML or JSON response
}
// export async function fetchUsersFromDevice(device) {
//   const { ip, port, username, password } = device;

//   // Digest auth client
//   const client = new DigestFetch(username, password, { algorithm: 'MD5' });

//   const url = `http://${ip}:${port}/ISAPI/AccessControl/UserInfo/Search?format=json`;

//   // Search condition body (required by Hikvision ISAPI)
//   const body = {
//     UserInfoSearchCond: {
//       searchID: "1",
//       maxResults: 50,
//       searchResultPosition: 0
//     }
//   };

//   // POST request with Digest Auth
//   const response = await client.fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body),
//   });

//   if (!response.ok) {
//     const text = await response.text();
//     throw new Error(`Device responded with ${response.status} ${response.statusText}: ${text}`);
//   }

//   const data = await response.json();
//   return data;
// }


/// working code

// export async function fetchUsersFromDevice(device, institutionId) {
//   const { ip, port, username, password } = device;

//   // Digest auth client
//   const client = new DigestFetch(username, password, { algorithm: "MD5" });
//   const url = `http://${ip}:${port}/ISAPI/AccessControl/UserInfo/Search?format=json`;

//   let searchResultPosition = 0;
//   const pageSize = 30; // device limit
//   const allUsers = [];

//   while (true) {
//     const body = {
//       UserInfoSearchCond: {
//         searchID: "0",
//         maxResults: pageSize,
//         searchResultPosition
//       }
//     };

//     const response = await client.fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });

//     if (!response.ok) {
//       const text = await response.text();
//       throw new Error(
//         `Device responded with ${response.status} ${response.statusText}: ${text}`
//       );
//     }

//     const data = await response.json();

//     const users =
//       data?.UserInfoSearch?.UserInfo
//         ? Array.isArray(data.UserInfoSearch.UserInfo)
//           ? data.UserInfoSearch.UserInfo
//           : [data.UserInfoSearch.UserInfo]
//         : [];

//     if (users.length === 0) {
//       break; // no more users
//     }

//     // Save/Update into MongoDB
//     for (const u of users) {
//       const doc = await User.findOneAndUpdate(
//         { institutionId, employeeNo: u.employeeNo },
//         {
//           institutionId,
//           employeeNo: u.employeeNo,
//           name: u.name,
//           userType: u.userType || "normal",
//         },
//         { upsert: true, new: true }
//       );
//       allUsers.push(doc);
//     }

//     // Prepare for next page
//     searchResultPosition += users.length;

//     // Stop if device returned less than page size (last page)
//     if (users.length < pageSize) {
//       break;
//     }
//   }

//   return allUsers;
// }


/// test code with pagination
// export async function fetchUsersFromDevice(device, institutionId) {
//   const { ip, port, username, password } = device;

//   console.log('====================================');
//   console.log(device);
//   console.log('====================================');
//   const client = new DigestFetch(username, password, { algorithm: "MD5" });
//   const url = `http://${ip}:${port}/ISAPI/AccessControl/UserInfo/Search?format=json`;

//   let searchResultPosition = 0;
//   const pageSize = 30; // device API limit
//   const allUsers = [];
//   let hasMore = true;

//   while (hasMore) {
//     const body = {
//       UserInfoSearchCond: {
//         searchID: "0",
//         maxResults: pageSize,
//         searchResultPosition
//       }
//     };

//     const response = await client.fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });

//     if (!response.ok) {
//       const text = await response.text();
//       throw new Error(
//         `Device responded with ${response.status} ${response.statusText}: ${text}`
//       );
//     }

//     const data = await response.json();
//     const infoSearch = data?.UserInfoSearch;

//     const users =
//       infoSearch?.UserInfo
//         ? Array.isArray(infoSearch.UserInfo)
//           ? infoSearch.UserInfo
//           : [infoSearch.UserInfo]
//         : [];

//     // Save/Update each user to MongoDB
//     for (const u of users) {
//       const doc = await User.findOneAndUpdate(
//         { institutionId, employeeNo: u.employeeNo },
//         {
//           institutionId,
//           employeeNo: u.employeeNo,
//           name: u.name,
//           userType: u.userType || "normal",
//           // ...add other fields as needed
//         },
//         { upsert: true, new: true }
//       );
//       allUsers.push(doc);
//     }

//     searchResultPosition += users.length;

//     // Hikvision ISAPI returns "OK" when all users fetched
//     hasMore = infoSearch?.responseStatusStrg !== "OK";
//     // Defensive: Also break if fewer than pageSize records returned (last page)
//     if (users.length < pageSize) break;
//   }

//   return allUsers;
// }

/// vertion 2
// export async function fetchUsersFromDevice(device, institutionId) {
//   const { ip, port, username, password } = device;
//   const client = new DigestFetch(username, password, { algorithm: "MD5" });

//   const userUrl = `http://${ip}:${port}/ISAPI/AccessControl/UserInfo/Search?format=json`;
//   const cardUrl = `http://${ip}:${port}/ISAPI/AccessControl/CardInfo/Search?format=json`;

//   const pageSize = 30;

//   // Fetch all users
//   let searchResultPosition = 0;
//   let hasMoreUsers = true;
//   const allUsers = [];

//   while (hasMoreUsers) {
//     const userBody = {
//       UserInfoSearchCond: {
//         searchID: "0",
//         maxResults: pageSize,
//         searchResultPosition
//       }
//     };

//     const userResponse = await client.fetch(userUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(userBody),
//     });

//     if (!userResponse.ok) {
//       const text = await userResponse.text();
//       throw new Error(`Device responded with ${userResponse.status} ${userResponse.statusText}: ${text}`);
//     }

//     const userData = await userResponse.json();
//     const userInfoSearch = userData?.UserInfoSearch;
//     const users = userInfoSearch?.UserInfo ? (Array.isArray(userInfoSearch.UserInfo) ? userInfoSearch.UserInfo : [userInfoSearch.UserInfo]) : [];

//     // Upsert user documents
//     for (const u of users) {
//       const doc = await User.findOneAndUpdate(
//         { institutionId, employeeNo: u.employeeNo },
//         {
//           institutionId,
//           employeeNo: u.employeeNo,
//           name: u.name,
//           userType: u.userType || "normal",
//           // clear any existing cardNo here; will be updated below if found
//           cardNo: null,
//         },
//         { upsert: true, new: true }
//       );
//       allUsers.push(doc);
//     }

//     searchResultPosition += users.length;
//     hasMoreUsers = userInfoSearch?.responseStatusStrg !== "OK";
//     if (users.length < pageSize) break;
//   }

//   // Fetch all cards and update users with cardNo
//   let cardPosition = 0;
//   let hasMoreCards = true;

//   while (hasMoreCards) {
//     const cardBody = {
//       CardInfoSearchCond: {
//         searchID: "1",
//         maxResults: pageSize,
//         searchResultPosition: cardPosition,
//         CardNoList: [],
//       }
//     };

//     const cardResponse = await client.fetch(cardUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(cardBody),
//     });

//     if (!cardResponse.ok) {
//       const text = await cardResponse.text();
//       throw new Error(`Device responded with ${cardResponse.status} ${cardResponse.statusText}: ${text}`);
//     }

//     const cardData = await cardResponse.json();
//     const cardInfoSearch = cardData?.CardInfoSearch;
//     const cards = cardInfoSearch?.CardInfo ? (Array.isArray(cardInfoSearch.CardInfo) ? cardInfoSearch.CardInfo : [cardInfoSearch.CardInfo]) : [];

//     // Update user documents with cardNo
//     for (const c of cards) {
//       await User.findOneAndUpdate(
//         { institutionId, employeeNo: c.employeeNo },
//         {
//           $set: {
//             cardNo: c.cardNo,
//             cardType: c.cardType || "normalCard", // Optionally add cardType in user model if suitable
//           }
//         }
//       );
//     }

//     cardPosition += cards.length;
//     hasMoreCards = cardInfoSearch?.responseStatusStrg !== "OK";
//     if (cards.length < pageSize) break;
//   }

//   return { users: allUsers };
// }

// export async function fetchUsersFromDevice(device, institutionId) {
//   const { ip, port, username, password } = device;
//   const client = new DigestFetch(username, password, { algorithm: "MD5" });

//   const userUrl = `http://${ip}:${port}/ISAPI/AccessControl/UserInfo/Search?format=json`;
//   const cardUrl = `http://${ip}:${port}/ISAPI/AccessControl/CardInfo/Search?format=json`;

//   const pageSize = 30;
//   const allUsers = [];

//   // ============================
//   // 🔹 Fetch all USERS
//   // ============================
//   let searchResultPosition = 0;

//   while (true) {
//     const userBody = {
//       UserInfoSearchCond: {
//         searchID: "0",
//         maxResults: pageSize,
//         searchResultPosition
//       }
//     };

//     const userResponse = await client.fetch(userUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(userBody),
//     });

//     if (!userResponse.ok) {
//       const text = await userResponse.text();
//       throw new Error(`Device responded with ${userResponse.status} ${userResponse.statusText}: ${text}`);
//     }

//     const userData = await userResponse.json();
//     const userInfoSearch = userData?.UserInfoSearch;

//     const users = userInfoSearch?.UserInfo
//       ? (Array.isArray(userInfoSearch.UserInfo) ? userInfoSearch.UserInfo : [userInfoSearch.UserInfo])
//       : [];

//     for (const u of users) {
//       const doc = await User.findOneAndUpdate(
//         { institutionId, employeeNo: u.employeeNo },
//         {
//           institutionId,
//           employeeNo: u.employeeNo,
//           name: u.name,
//           userType: u.userType || "normal",
//           cardNo: null, // clear, will update later
//         },
//         { upsert: true, new: true }
//       );
//       allUsers.push(doc);
//     }

//     // ✅ Stop if device says "NO MATCH"
//     if (userInfoSearch?.responseStatusStrg !== "OK") {
//       break;
//     }

//     searchResultPosition += pageSize;
//   }

//   // ============================
//   // 🔹 Fetch all CARDS
//   // ============================
//   let cardPosition = 0;

//   while (true) {
//     const cardBody = {
//       CardInfoSearchCond: {
//         searchID: "1",
//         maxResults: pageSize,
//         searchResultPosition: cardPosition
//       }
//     };

//     const cardResponse = await client.fetch(cardUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(cardBody),
//     });

//     if (!cardResponse.ok) {
//       const text = await cardResponse.text();
//       throw new Error(`Device responded with ${cardResponse.status} ${cardResponse.statusText}: ${text}`);
//     }

//     const cardData = await cardResponse.json();
//     const cardInfoSearch = cardData?.CardInfoSearch;

//     const cards = cardInfoSearch?.CardInfo
//       ? (Array.isArray(cardInfoSearch.CardInfo) ? cardInfoSearch.CardInfo : [cardInfoSearch.CardInfo])
//       : [];

//     for (const c of cards) {
//       await User.findOneAndUpdate(
//         { institutionId, employeeNo: c.employeeNo },
//         {
//           $set: {
//             cardNo: c.cardNo,
//             cardType: c.cardType || "normalCard",
//           }
//         }
//       );
//     }

//     // ✅ Stop if device says "NO MATCH"
//     if (cardInfoSearch?.responseStatusStrg !== "OK") {
//       break;
//     }

//     cardPosition += pageSize;
//   }

//   return allUsers; // return the array directly
// }


export async function fetchUsersFromDevice(device, institutionId, userModel = User) {
  // Ensure we have valid device credentials
  if (!device || !device.ipAddress || !device.port) {
    throw new Error("Invalid device configuration: missing IP or port");
  }
  
  // Use the correct password format - capitalize first letter if it's the default admin account
  let password = device.password;
  if (device.username === 'admin' && device.password.toLowerCase() === 'amd@737373') {
    password = 'Amd@737373';
    console.log('Correcting password capitalization for admin account');
  }
  
  console.log(`Connecting to device at ${device.ipAddress}:${device.port} with username: ${device.username}`);
  const url = `http://${device.ipAddress}:${device.port}/ISAPI/AccessControl/UserInfo/Search?format=json`;

  const pageSize = 30; // number of records per batch
  let searchResultPosition = 0;
  const allUsers = [];
  let batchCount = 0;
  let hasMore = true;

  // Continue fetching while hasMore is true
  while (hasMore) {
    batchCount++;
    
    // ✅ Request body for the current batch
    const body = {
      UserInfoSearchCond: {
        searchID: "0",
        searchResultPosition,
        maxResults: pageSize,
        EmployeeNoList: []
      }
    };
    
    console.log('====================================');
    console.log(`BATCH ${batchCount}: Fetching users at position=${searchResultPosition}, maxResults=${pageSize}`);
    console.log(JSON.stringify(body, null, 2));
    console.log('====================================');

    try {
      // Create a new client for each batch to avoid session timeout issues
      const client = new DigestFetch(device.username, password, { algorithm: "MD5" });
      console.log(`BATCH ${batchCount}: Creating new client for this batch`);
      
      const res = await client.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeout: 15000 // Increase timeout to 15 seconds
      });

      // Handle unauthorized
      if (res.status === 401) {
        const text = await res.text();
        throw new Error(`Unauthorized! Device rejected credentials:\n${text}`);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Device responded with ${res.status} ${res.statusText}: ${text}`);
      }

      const data = await res.json();
      console.log('====================================');
      console.log(`RESPONSE (BATCH ${batchCount}):`);
      console.log(JSON.stringify(data, null, 2));
      console.log('====================================');

      const userInfoSearch = data?.UserInfoSearch;

      if (!userInfoSearch) {
        console.log(`BATCH ${batchCount}: No userInfoSearch data returned, stopping pagination`);
        hasMore = false;
        break;
      }

      console.log(`BATCH ${batchCount}: Response status: "${userInfoSearch.responseStatusStrg}"`);
      
      // Extract users (handle single object or array)
      const users = userInfoSearch.UserInfo
        ? Array.isArray(userInfoSearch.UserInfo)
          ? userInfoSearch.UserInfo
          : [userInfoSearch.UserInfo]
        : [];

      console.log(`BATCH ${batchCount}: Received ${users.length} users in this batch`);
      
      // Save/update users in DB using the provided model (institution-specific or global)
      for (const u of users) {
        const doc = await userModel.findOneAndUpdate(
          { institutionId, employeeNo: u.employeeNo },
          {
            institutionId,
            employeeNo: u.employeeNo,
            name: u.name,
            userType: u.userType || "normal",
            cardNo: null, // will update later
          },
          { upsert: true, new: true }
        );
        allUsers.push(doc);
      }

      // Update position for next batch - IMPORTANT: increment by the actual number of users received
      // This matches the pattern in syncFromDevice
      searchResultPosition += users.length;
      
      // Check if we should continue - ONLY continue if response status is "MORE"
      // This matches the pattern in syncFromDevice
      hasMore = userInfoSearch.responseStatusStrg === "MORE";
      console.log(`BATCH ${batchCount}: Continue fetching? ${hasMore ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.error(`BATCH ${batchCount}: Error fetching users:`, error);
      hasMore = false; // Stop on error
      throw error;
    }
  }

  console.log('====================================');
  console.log(`COMPLETED: Total batches fetched: ${batchCount}`);
  console.log(`COMPLETED: Total users fetched: ${allUsers.length}`);
  console.log('====================================');
  
  return allUsers;
}