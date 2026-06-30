import DigestFetch from "digest-fetch";

const API_URL =
  "http://124.123.105.13:32223/ISAPI/AccessControl/UserInfo/Record?format=json";
const USERNAME = "admin";
const PASSWORD = "amd@737373";

// Format time for Hikvision (no timezone offset like +05:30)
function formatHikvisionTime(date) {
  const pad = (n) => (n < 10 ? "0" + n : n);
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`;
}

function generateUser(empNo) {
  const now = new Date();
  const beginTime = formatHikvisionTime(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0)
  );
  const endTime = formatHikvisionTime(
    new Date(now.getFullYear() + 2, now.getMonth(), now.getDate(), 18, 0, 0)
  );

  return {
    UserInfo: {
      employeeNo: `EMP${empNo.toString().padStart(3, "0")}`,
      name: `User${empNo}`,
      userType: "normal",
      Valid: {
        enable: true,
        beginTime,
        endTime,
      },
      doorRight: "1",
      RightPlan: [
        {
          doorNo: 1,
          planTemplateNo: "1",
        },
      ],
      PersonInfoExtends: [
        {
          name: "Info",
          value: `EMP${empNo.toString().padStart(3, "0")}`,
        },
      ],
    },
  };
}

async function addUser(user, attempt = 1) {
  const client = new DigestFetch(USERNAME, PASSWORD); // fresh client each time
  try {
    const response = await client.fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const errText = await response.text();

      // Retry on Unauthorized
      if (response.status === 401 && attempt < 3) {
        console.warn(
          `⚠️ Unauthorized for ${user.UserInfo.employeeNo}, retrying in 3s (attempt ${attempt})`
        );
        await new Promise((r) => setTimeout(r, 3000));
        return addUser(user, attempt + 1);
      }

      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errText}`
      );
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

async function addUsers(totalUsers = 100) {
  for (let i = 1; i <= totalUsers; i++) {
    const user = generateUser(i);
    console.log(`➡️ Adding user: ${user.UserInfo.employeeNo}`);
    try {
      const res = await addUser(user);
      console.log(`✅ User ${user.UserInfo.employeeNo} added successfully`);
    } catch (error) {
      console.error(`❌ Error adding ${user.UserInfo.employeeNo}:`, error.message);
    }

    // Delay between requests to avoid session lockout
    await new Promise((r) => setTimeout(r, 1500));
  }
}

// Run
addUsers(100).catch(console.error);
