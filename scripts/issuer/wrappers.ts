import { IssuerProps } from '../utils/types'

/**
 * Wrapper instruments — tokens whose ISSUER is the protocol that minted the
 * wrapper, not the desk behind what it wraps.
 *
 * A `PT-sUSDE` is Pendle's instrument: its redemption depends on Pendle's
 * contracts, its admin and its oracle. It is ALSO Ethena's credit, and that
 * half is `props.issuerExposure` (resolved by walking the hop). Both are true;
 * before either existed, a PT over sUSDe matched no issuer filter at all —
 * 2 203 wrapper tokens in the lists, zero attributions between them.
 *
 * Detected from the family prop the token already carries rather than curated
 * by group, because that prop IS the fact: a token with `props.pendle` was
 * minted by Pendle, on any chain, including a bridged mirror
 * (`pendle.bridgedFrom`), with no list to keep in sync.
 *
 * A curated entry in `ISSUER_CURATED` still wins over this — the overlay only
 * falls back to a wrapper issuer when the group names no desk of its own.
 */
export const WRAPPER_ISSUERS: Record<string, IssuerProps> = {
  pendle: { id: 'pendle', name: 'Pendle', kind: 'protocol' },
  spectra: { id: 'spectra', name: 'Spectra', kind: 'protocol' },
  exponent: { id: 'exponent', name: 'Exponent', kind: 'protocol' },
  receipt: { id: 'dolomite', name: 'Dolomite', kind: 'protocol' },
}

/** The wrapper issuer for a token's props, if it is one. */
export function wrapperIssuer(props: Record<string, any> | undefined | null): IssuerProps | undefined {
  if (!props) return undefined
  for (const key of Object.keys(WRAPPER_ISSUERS)) {
    if (props[key]) return WRAPPER_ISSUERS[key]
  }
  return undefined
}

/**
 * The address this token is a claim on, one hop down — the only mechanism
 * available for the exposure walk.
 *
 * There is no generic hop to use: `props.underlying` (the phase-4 walker in
 * types.ts) is declared and emitted on **0 of 50 303 tokens**, so these
 * per-family fields are the whole of it. Each is an address on the SAME chain
 * as the holder, which is why the walk never changes chain.
 *
 * Ordered by how exact the hop is: a PT names what it redeems into, a Dolomite
 * receipt names what it wraps 1:1.
 */
export function wrapperHop(props: Record<string, any> | undefined | null): string | undefined {
  if (!props) return undefined
  return (
    props.pendle?.underlyingAsset ??
    props.spectra?.underlyingAsset ??
    props.exponent?.underlyingAsset ??
    props.receipt?.underlying ??
    undefined
  )
}
