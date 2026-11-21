import logoIcon from '../../assets/logo/app-icon.webp'

/**
 * Logo resmi Rupaloka: Maskot berblangkon dengan ornamen Nusantara dan warna tema.
 */
export function LogoMark({ className = 'size-10' }: { className?: string }) {
  return (
    <img
      src={logoIcon}
      alt="Logo Rupaloka"
      className={`inline-block rounded-xl object-contain shadow-xs ${className}`}
      draggable={false}
    />
  )
}

export default LogoMark
