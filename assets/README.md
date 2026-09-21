# 📁 Pasta de Ativos Personalizados (FutPulse)

Coloque aqui suas imagens personalizadas para enviar diretamente para o **Convex File Storage** via CDN global.

### Como organizar:

1. **Escudos dos Times:**
   - Pasta: `assets/teams/`
   - Exemplos de nomes de arquivos:
     - `vila-nova.png` ou `Vila Nova.png`
     - `fortaleza.png`
     - `novorizontino.png`
     - `athletic.png`
     - `sao-bernardo.png`
     - `criciuma.png`
     - `flamengo.png`

2. **Logos dos Campeonatos:**
   - Pasta: `assets/leagues/`
   - Exemplos de nomes de arquivos:
     - `brasileirao-serie-a.png`
     - `brasileirao-serie-b.png`
     - `premier-league.png`
     - `champions-league.png`

3. **Fotos dos Estádios:**
   - Pasta: `assets/stadiums/`
   - Exemplos:
     - `maracana.jpg`
     - `allianz-parque.jpg`
     - `serra-dourada.jpg`

---

### Como fazer o upload:

No terminal, basta executar:

```bash
npm run upload-assets
```

O script:
1. Lê automaticamente todos os arquivos colocados nessas pastas (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`).
2. Faz o upload de cada arquivo para o **Convex File Storage**.
3. Associa a URL gerada pela CDN ao time, liga ou estádio correspondente pelo nome.
