import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { glassesAppUrl } from "../routes.js";
import "./controls.css";

export const LandingPage = () => {
  const url = glassesAppUrl(location.origin);
  const [qr, setQr] = useState<string>();
  useEffect(() => { void toDataURL(url, { margin: 1, width: 280 }).then(setQr); }, [url]);
  return <main className="landing-page">
    <h1>RSVP Reader</h1>
    <p>Open this reader on your glasses.</p>
    {qr ? <img className="qr" src={qr} alt={`QR code for ${url}`} /> : null}
    <a href={url}>Open glasses app</a>
    <a href="/controls">Open controls</a>
  </main>;
};
