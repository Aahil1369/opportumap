// A member's route on a dark board tile: LHE → YYZ, in sign yellow. Screen readers hear
// "Route: LHE to YYZ". `ends` is routeEnds(profile) ({ from, to }); nothing renders without it.
// No hooks: anything can render it.

export default function RouteChip({ ends, className }) {
  if (!ends?.from || !ends?.to) return null;
  return (
    <span className={className ? `rc ${className}` : 'rc'}>
      <span className="sr-only">{`Route: ${ends.from} to ${ends.to}`}</span>
      <span aria-hidden="true">
        {ends.from}
        <span className="rc-arrow"> → </span>
        {ends.to}
      </span>
    </span>
  );
}
