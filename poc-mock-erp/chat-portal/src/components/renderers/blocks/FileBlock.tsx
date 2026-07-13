import { LazyImage } from "../../LazyImage";

export function FileBlock({ name, url, mime }: { name: string; url?: string | null; mime?: string | null }) {
  const isImage = mime?.startsWith("image") || /\.(png|jpe?g|gif|webp)$/i.test(name);
  return (
    <div className="block-file">
      {isImage && url ? (
        <LazyImage src={url} alt={name} className="block-file-image" />
      ) : (
        <div className="block-file-card">
          <span className="block-file-icon">📄</span>
          <span className="block-file-name">{name}</span>
          {url && (
            <a className="block-file-link" href={url} target="_blank" rel="noreferrer">
              下载
            </a>
          )}
        </div>
      )}
    </div>
  );
}
