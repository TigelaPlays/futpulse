// Dicionário de correspondências entre o nome do estádio na agenda e o ficheiro de imagem
const STADIUM_ALIASES: Record<string, string> = {
  // Liga A - Rodada 1
  "johan cruijff arena": "Johan Cruyff Arena.jpg",
  "johan cruyff arena": "Johan Cruyff Arena.jpg",
  "johan cruijff arena, amsterdã (países baixos)": "Johan Cruyff Arena.jpg",
  "rajko mitic stadium": "Stadion Rajko Mitić.jpg",
  "rajko mitić stadium": "Stadion Rajko Mitić.jpg",
  "rajko mitić stadium, belgrado (sérvia)": "Stadion Rajko Mitić.jpg",
  "stadion rajko mitić": "Stadion Rajko Mitić.jpg",
  "ullevaal stadion": "Ullevaal Stadion.jpg",
  "ullevaal stadion, oslo (noruega)": "Ullevaal Stadion.jpg",
  "estadio jose alvalade": "José Alvalade.jpg",
  "estádio josé alvalade": "José Alvalade.jpg",
  "estádio josé alvalade, lisboa (portugal)": "José Alvalade.jpg",
  "josé alvalade": "José Alvalade.jpg",
  "jose alvalade": "José Alvalade.jpg",
  "stadio olimpico": "Stadio Olimpico di Roma.jpg",
  "stadio olimpico, roma (itália)": "Stadio Olimpico di Roma.jpg",
  "stadio olimpico di roma": "Stadio Olimpico di Roma.jpg",
  "kocaeli stadyumu": "Kocaeli Stadyumu.jpg",
  "kocaeli stadyumu, kocaeli (turquia)": "Kocaeli Stadyumu.jpg",
  "wembley stadium": "Wembley Stadium.jpg",
  "wembley stadium, londres (inglaterra)": "Wembley Stadium.jpg",
  "wembley": "Wembley Stadium.jpg",
  "fortuna arena": "Fortuna Arena.jpg",
  "fortuna arena, praga (tchéquia)": "Fortuna Arena.jpg",
  
  // Liga B, C e D (conforme a lista da rodada 1)
  "ernst-happel-stadion": "Raiffeisen Arena.jpg",
  "raiffeisen arena": "Raiffeisen Arena.jpg",
  "fadil vokrri stadium": "Stadiumi Fadil Vokrri.jpg",
  "stadiumi fadil vokrri": "Stadiumi Fadil Vokrri.jpg",
  "estadi nacional": "Nou Estadi d'Encamp.jpg",
  "nou estadi d'encamp": "Nou Estadi d'Encamp.jpg",
  "rheinpark stadion": "Rheinpark Stadion.jpg",
  "boris paichadze dinamo arena": "Boris Paichadze.jpg",
  "boris paichadze": "Boris Paichadze.jpg",
  "puskas arena": "Puskás Aréna.jpg",
  "puskás aréna": "Puskás Aréna.jpg",
  "pge narodowy": "PGE Narodowy.jpg",
  "strawberry arena": "Strawberry Arena.jpg",
  "vazgen sargsyan republican stadium": "Vazgen Sargsyan Republican Stadium.jpg",
  "podgorica city stadium": "Podgorica City Stadium.jpg",
  "stadion stojice": "Stožice Stadium.jpg",
  "stadion stožice": "Stožice Stadium.jpg",
  "stožice stadium": "Stožice Stadium.jpg",
  "stozice stadium": "Stožice Stadium.jpg",
  "tose proeski national arena": "Toše Proeski Arena.jpg",
  "toše proeski national arena": "Toše Proeski Arena.jpg",
  "toše proeski arena": "Toše Proeski Arena.jpg",
  "tose proeski arena": "Toše Proeski Arena.jpg",
  "san marino stadium": "San Marino Stadium.jpg",
  "arena kombetare": "Arena Kombëtare.jpg",
  "arena kombëtare": "Arena Kombëtare.jpg",
  "torsvollur": "Tórsvøllur.jpg",
  "tórsvøllur": "Tórsvøllur.jpg",
  "futbal tatran arena": "Futbal Tatran Arena.jpg",
  "futbal tatran aréna": "Futbal Tatran Arena.jpg",
  "laugardalsvollur": "Laugardalsvöllur.jpg",
  "laugardalsvöllur": "Laugardalsvöllur.jpg",
  "hristo botev stadium": "Stadion Hristo Botev.jpg",
  "stadion hristo botev": "Stadion Hristo Botev.jpg",
};

/**
 * Devolve o caminho absoluto do asset do estádio ou um fallback padrão
 */
export function getStadiumImageUrl(stadiumName?: string, fallbackUrl = "/assets/stadiums_nations/default.jpg"): string {
  if (!stadiumName) return fallbackUrl;

  // Extrai apenas o nome do estádio caso venha no formato "Nome do Estádio, Cidade (País)"
  const cleanName = stadiumName.split(",")[0].trim().toLowerCase();

  const fileName = STADIUM_ALIASES[cleanName] || STADIUM_ALIASES[stadiumName.trim().toLowerCase()] || `${stadiumName.split(",")[0].trim()}.jpg`;

  return `/assets/stadiums_nations/${encodeURIComponent(fileName)}`;
}
