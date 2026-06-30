import DigestFetch from 'digest-fetch';

async function run() {
  const ip = '124.123.64.64';
  const port = 33001;
  const username = 'admin';
  const password = 'Amd@737373';
  
  const client = new DigestFetch(username, password, { algorithm: 'MD5' });
  
  // Set to HTTP on port 9001 with raw IP address
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<HttpHostNotification version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
<id>1</id>
<url>/api/institutions/68e0e148f633a16a99a9df2e/hikvision/listen</url>
<protocolType>HTTP</protocolType>
<parameterFormatType>XML</parameterFormatType>
<addressingFormatType>ipaddress</addressingFormatType>
<ipAddress>103.174.102.191</ipAddress>
<portNo>9001</portNo>
<httpAuthenticationMethod>none</httpAuthenticationMethod>
<SubscribeEvent>
  <heartbeat>30</heartbeat>
  <eventMode>all</eventMode>
  <EventList>
    <Event>
      <type>AccessControllerEvent</type>
      <minorAlarm></minorAlarm>
      <minorException></minorException>
      <minorOperation></minorOperation>
      <minorEvent></minorEvent>
      <pictureURLType>binary</pictureURLType>
    </Event>
  </EventList>
</SubscribeEvent>
</HttpHostNotification>`;

  console.log(`Sending PUT request to http://${ip}:${port}/ISAPI/Event/notification/httpHosts/1...`);
  
  try {
    const res = await client.fetch(`http://${ip}:${port}/ISAPI/Event/notification/httpHosts/1`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/xml',
        'Accept': 'application/xml, application/json'
      },
      body: xmlBody,
      timeout: 10000
    });
    
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response:\n${text}`);
  } catch (err) {
    console.error('Error updating config:', err.message);
  }
}

run();
