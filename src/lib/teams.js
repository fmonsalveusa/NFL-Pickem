// Colores oficiales y datos de todos los 32 equipos NFL
// Los logos vienen de ESPN CDN: https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png

export const NFL_TEAMS = {
  ARI: { name: 'Cardinals', city: 'Arizona',      primary: '#97233F', secondary: '#000000', text: '#FFFFFF' },
  ATL: { name: 'Falcons',   city: 'Atlanta',      primary: '#A71930', secondary: '#000000', text: '#FFFFFF' },
  BAL: { name: 'Ravens',    city: 'Baltimore',    primary: '#241773', secondary: '#9E7C0C', text: '#9E7C0C' },
  BUF: { name: 'Bills',     city: 'Buffalo',      primary: '#00338D', secondary: '#C60C30', text: '#FFFFFF' },
  CAR: { name: 'Panthers',  city: 'Carolina',     primary: '#0085CA', secondary: '#101820', text: '#FFFFFF' },
  CHI: { name: 'Bears',     city: 'Chicago',      primary: '#0B162A', secondary: '#C83803', text: '#C83803' },
  CIN: { name: 'Bengals',   city: 'Cincinnati',   primary: '#FB4F14', secondary: '#000000', text: '#FFFFFF' },
  CLE: { name: 'Browns',    city: 'Cleveland',    primary: '#311D00', secondary: '#FF3C00', text: '#FF3C00' },
  DAL: { name: 'Cowboys',   city: 'Dallas',       primary: '#003594', secondary: '#041E42', text: '#869397' },
  DEN: { name: 'Broncos',   city: 'Denver',       primary: '#FB4F14', secondary: '#002244', text: '#FFFFFF' },
  DET: { name: 'Lions',     city: 'Detroit',      primary: '#0076B6', secondary: '#B0B7BC', text: '#FFFFFF' },
  GB:  { name: 'Packers',   city: 'Green Bay',    primary: '#203731', secondary: '#FFB612', text: '#FFB612' },
  HOU: { name: 'Texans',    city: 'Houston',      primary: '#03202F', secondary: '#A71930', text: '#FFFFFF' },
  IND: { name: 'Colts',     city: 'Indianapolis', primary: '#002C5F', secondary: '#A2AAAD', text: '#FFFFFF' },
  JAX: { name: 'Jaguars',   city: 'Jacksonville', primary: '#006778', secondary: '#9F792C', text: '#9F792C' },
  KC:  { name: 'Chiefs',    city: 'Kansas City',  primary: '#E31837', secondary: '#FFB81C', text: '#FFB81C' },
  LAC: { name: 'Chargers',  city: 'Los Angeles',  primary: '#0080C6', secondary: '#FFC20E', text: '#FFC20E' },
  LAR: { name: 'Rams',      city: 'Los Angeles',  primary: '#003594', secondary: '#FFA300', text: '#FFA300' },
  LV:  { name: 'Raiders',   city: 'Las Vegas',    primary: '#000000', secondary: '#A5ACAF', text: '#A5ACAF' },
  MIA: { name: 'Dolphins',  city: 'Miami',        primary: '#008E97', secondary: '#FC4C02', text: '#FFFFFF' },
  MIN: { name: 'Vikings',   city: 'Minnesota',    primary: '#4F2683', secondary: '#FFC62F', text: '#FFC62F' },
  NE:  { name: 'Patriots',  city: 'New England',  primary: '#002244', secondary: '#C60C30', text: '#B0B7BC' },
  NO:  { name: 'Saints',    city: 'New Orleans',  primary: '#101820', secondary: '#D3BC8D', text: '#D3BC8D' },
  NYG: { name: 'Giants',    city: 'New York',     primary: '#0B2265', secondary: '#A71930', text: '#FFFFFF' },
  NYJ: { name: 'Jets',      city: 'New York',     primary: '#125740', secondary: '#000000', text: '#FFFFFF' },
  PHI: { name: 'Eagles',    city: 'Philadelphia', primary: '#004C54', secondary: '#A5ACAF', text: '#A5ACAF' },
  PIT: { name: 'Steelers',  city: 'Pittsburgh',   primary: '#101820', secondary: '#FFB612', text: '#FFB612' },
  SEA: { name: 'Seahawks',  city: 'Seattle',      primary: '#002244', secondary: '#69BE28', text: '#69BE28' },
  SF:  { name: '49ers',     city: 'San Francisco',primary: '#AA0000', secondary: '#B3995D', text: '#B3995D' },
  TB:  { name: 'Buccaneers',city: 'Tampa Bay',    primary: '#D50A0A', secondary: '#FF7900', text: '#FFFFFF' },
  TEN: { name: 'Titans',    city: 'Tennessee',    primary: '#0C2340', secondary: '#4B92DB', text: '#4B92DB' },
  WSH: { name: 'Commanders',city: 'Washington',   primary: '#5A1414', secondary: '#FFB612', text: '#FFB612' },
}

// URL del logo oficial de ESPN
export const teamLogo = (abbr) =>
  `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr?.toLowerCase()}.png`

// Calcula si el color primario es oscuro (para saber si el texto blanco es legible)
export const isDark = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Fórmula de luminancia relativa
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}
