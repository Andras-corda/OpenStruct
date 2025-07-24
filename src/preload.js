const { contextBridge } = require('electron');

console.log("✅ preload.js chargé");

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong'
});