import { useState } from "react";
import CaptivePortal from "./CaptivePortal";
import secureWifi from "../../assets/securewifi.png";

interface WifiElementProps {
  name: string;
  isSecure: boolean;
}

function WifiElement({ name, isSecure }: WifiElementProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "12px",
          marginBottom: "10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          justifyContent: "space-between",
          width: "300px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={secureWifi} alt="Wi-Fi" width={32} />
          <span>{name}</span>
        </div>
        <button onClick={() => setOpen(true)}>Connect</button>
      </div>

      {open && (
        <CaptivePortal
          ssid={name}
          isSecure={isSecure}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default WifiElement;
