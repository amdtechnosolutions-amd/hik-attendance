import DigestFetch from "digest-fetch";

// Replace with your Hikvision device credentials
const client = new DigestFetch("admin", "amd@737373");
const baseUrl = "http://124.123.105.13:32223";

// 🔹 Generate EMP001 to EMP100 automatically
const employees = Array.from({ length: 100 }, (_, i) =>
  `EMP${String(i + 1).padStart(3, "0")}`
);

// Function to assign card
async function addCard(employeeNo) {
  const payload = {
    CardInfo: {
      employeeNo: employeeNo,
      cardNo: employeeNo, // using empNo as cardNo
      cardType: "normalCard"
    }
  };

  try {
    const res = await client.fetch(
      `${baseUrl}/ISAPI/AccessControl/CardInfo/Record?format=json`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Error adding card for ${employeeNo}:`, errText);
    } else {
      console.log(`✅ Card assigned to ${employeeNo}`);
    }
  } catch (err) {
    console.error(`❌ Exception for ${employeeNo}:`, err.message);
  }
}

// Main loop
(async () => {
  for (const emp of employees) {
    console.log(`➡️ Assigning card for: ${emp}`);
    await addCard(emp);
  }
})();
