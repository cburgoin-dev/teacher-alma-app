import Svg, { Path } from 'react-native-svg';

/** Decorative layer only; kept separate from copy for future official artwork. */
export function HeroArtwork({ result = false }: { result?: boolean }) {
  return <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none" accessible={false}>
    <Path d={result ? 'M330 0C265 30 378 65 325 115S340 186 400 220V0Z' : 'M0 65C65 10 122 60 181 21S290 2 340 40S410 65 400 130V220H0Z'} fill="#DEEDFF" />
    <Path d={result ? 'M400 105C351 100 360 148 317 166S315 213 355 220H400Z' : 'M0 174C50 120 101 170 157 151S253 172 294 143S368 165 400 141V220H0Z'} fill="#CDE5FF" opacity={result ? .65 : .55} />
    {!result ? <Path d="M58 75C74 32 138 53 184 45S292 43 333 81S337 151 290 166S190 157 129 172S44 126 58 75Z" fill="#FFFFFF" opacity={.85} /> : null}
    <Path d={result ? 'M349 38C348 26 365 20 373 30C387 23 396 32 395 43H345Z' : 'M25 51C24 37 40 30 49 40C64 28 81 38 79 52H25ZM303 171C303 157 319 153 327 163C341 153 356 164 354 175H303Z'} fill="#FFFFFF" opacity={.8} />
    <Path d={result ? 'M375 155l7-10M383 168l10-2' : 'M52 139l-10 8M62 151l-5 12M325 60l11-9'} stroke="#75ACEE" strokeWidth="3" strokeLinecap="round" />
  </Svg>;
}
