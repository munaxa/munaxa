import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/constants';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${SITE_NAME} — School Operating System`;

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '80px',
        background: 'linear-gradient(135deg, rgb(11,5,24) 0%, rgb(34,21,71) 100%)',
        color: 'rgb(252,250,255)',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 88,
          height: 88,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgb(122,63,255) 0%, rgb(255,142,110) 120%)',
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 36,
        }}
      >
        M
      </div>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
        {SITE_NAME} — School Operating System
      </div>
      <div style={{ display: 'flex', marginTop: 24, fontSize: 30, color: 'rgb(196,184,224)' }}>
        Run admissions, attendance, academics, finance &amp; communication in one platform.
      </div>
    </div>,
    { ...size },
  );
}
