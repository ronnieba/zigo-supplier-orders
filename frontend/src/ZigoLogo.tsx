export default function ZigoLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Green circle background */}
      <circle cx="60" cy="60" r="60" fill="#6B9E8A"/>
      {/* Hand holding branch - simplified botanical illustration */}
      <g stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Stem */}
        <path d="M60 85 Q58 70 55 58 Q52 45 50 35"/>
        {/* Leaves left */}
        <path d="M55 58 Q45 52 42 44 Q50 44 55 52"/>
        <path d="M53 68 Q41 65 38 56 Q47 58 53 66"/>
        {/* Leaves right */}
        <path d="M57 50 Q65 42 70 35 Q66 43 60 49"/>
        <path d="M56 63 Q67 58 72 50 Q66 57 58 62"/>
        {/* Top flower/branch */}
        <path d="M50 35 Q46 28 48 22"/>
        <path d="M50 35 Q54 27 56 22"/>
        <path d="M50 35 Q44 32 40 28"/>
        {/* Hand holding stem */}
        <path d="M55 80 Q52 83 50 88 Q54 87 58 84"/>
        <path d="M58 82 Q56 86 55 91 Q59 89 62 85"/>
        <path d="M62 83 Q61 88 61 93 Q65 90 66 86"/>
        <path d="M65 82 Q66 87 67 91 Q70 88 70 84"/>
        {/* Palm base */}
        <path d="M50 88 Q52 93 55 96 Q60 98 65 96 Q68 93 70 88"/>
      </g>
      {/* Hebrew text ציגו - large */}
      <text x="60" y="76" textAnchor="middle" fill="white" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="bold" letterSpacing="1">זיגו</text>
      {/* Subtitle */}
      <text x="60" y="106" textAnchor="middle" fill="white" fontSize="5.5" fontFamily="Arial, sans-serif" letterSpacing="0.5">קפה · מאפייה · מטבח מקומי</text>
    </svg>
  )
}
