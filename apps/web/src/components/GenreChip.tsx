interface Props {
  label: string;
}

export default function GenreChip({ label }: Props) {
  return <span className="genre-chip">{label}</span>;
}
