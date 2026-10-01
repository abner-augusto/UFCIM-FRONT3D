# Pesquisa — sensores IoT para qualidade do ar no UFCIM

**Consultado em:** 2026-09-28

## Contexto

O UFCIM é um Digital Twin/gestor de espaços acadêmicos. Para o protótipo, o sensor deve apoiar a leitura ambiental de salas e possíveis fluxos de manutenção. Prioridades: CO₂ medido por NDIR — não eCO₂ estimado —, temperatura, umidade, PM2.5/PM10 e TVOC/VOC. Formaldeído é desejável, mas não obrigatório.

## Recomendação curta

1. **BREATHE Airmonitor Plus** — é o melhor encaixe de especificação em um único aparelho: CO₂ NDIR, PM1/PM2.5/PM10, TVOC, HCHO, temperatura e umidade. Preço observado: US$109,99–129,99 antes de frete/impostos. O fabricante informa venda/estoque, mas a entrega internacional para o Brasil não foi confirmada.
2. **ATO-AIR-DM197** — cobre CO₂ NDIR, PM2.5, PM10, TVOC, HCHO, temperatura e umidade. Preço oficial: US$144,15, com entrega indicada de 6–12 dias; custo final no Brasil pode superar R$800–900.
3. **Temtop M100 2nd WiFi** — alternativa mais forte para o protótipo IoT: PM2.5, PM10, CO₂, TVOC, temperatura, umidade, Wi-Fi e expansão LoRa. Preço observado: US$169,99, cerca de R$880,67 usando US$1≈R$5,1807, antes de frete e impostos. A página atual detalha faixa/precisão, mas é prudente confirmar no checkout o tipo NDIR da variante exata; a linha M100 anterior informa SenseAir NDIR.
4. **Temtop M10+** — opção mais barata para CO₂ + VOC + PM2.5 + temperatura/umidade. Preço observado: US$99,99–129,99. Não entrega PM10 nem HCHO. Uma avaliação técnica identifica Sensirion SCD41 para CO₂ e SGP40 para VOC; o SCD41 usa princípio fotoacústico NDIR.

## Produtos e fontes

| Modelo | Medições relevantes | CO₂ | Preço observado / disponibilidade | Limitações |
|---|---|---|---|---|
| BREATHE Airmonitor Plus | PM1, PM2.5, PM10, TVOC, HCHO, temperatura, umidade | NDIR explícito do fabricante | US$109,99–129,99; site informa em estoque | Entrega ao Brasil não confirmada; importação pode ultrapassar o teto |
| ATO-AIR-DM197 | PM2.5, PM10, TVOC, HCHO, temperatura, umidade, AQI | NDIR explícito; 400–5000 ppm | US$144,15; ATO indica entrega de 6–12 dias | Sem loja brasileira verificada; frete/impostos não incluídos |
| Temtop M100 2nd WiFi | PM2.5, PM10, TVOC, CO₂, temperatura, umidade, AQI; Wi-Fi/LoRa | A variante M100 anterior usa SenseAir NDIR; confirmar M100 2nd exato | US$169,99; loja oficial/distribuidor informa compra online | Sem HCHO; provavelmente passa de R$900 com importação |
| Temtop M10+ | PM2.5, TVOC/VOC, CO₂, temperatura, umidade, AQI | Sensirion SCD41, NDIR fotoacústico — identificado em avaliação técnica; confirmar revisão | US$99,99–129,99; loja oficial | Não mede PM10 nem HCHO |
| Temtop M2000 2nd | PM2.5, PM10, HCHO, CO₂, temperatura, umidade; exportação de dados | NDIR SenseAir explícito | US$209,99; Elitech Brasil listou R$1.950,00 | Não mede TVOC; excede o orçamento |
| Temtop LKC-1000S+ 2nd | PM2.5, PM10, TVOC, HCHO, temperatura, umidade, AQI; exportação | Não mede CO₂ | R$1.190,00 na Elitech Brasil | Excede o teto e precisa de outro aparelho para CO₂ |
| Qingping Air Monitor 2 / Gen 2 | PM2.5, PM10, eTVOC, CO₂, temperatura, umidade, ruído | Atribuição independente ao Sensirion SCD40; não publicada claramente pela Qingping | US$149,99 na loja oficial; listagens brasileiras aparecem, mas preço/estoque variam | eTVOC é índice equivalente/trend, não concentração absoluta; não mede HCHO |
| Qingping Air Monitor Lite | PM2.5, PM10, CO₂, temperatura, umidade | NDIR atribuído por avaliação técnica independente | Há listagem no Mercado Livre; snippet observado em torno de R$162,76 | Não mede VOC/TVOC; confirmar anúncio e sensor antes de comprar |
| Yunir 6 em 1 (Amazon Brasil) | CO, CO₂, TVOC, HCHO, PM2.5, PM10; anúncio também indica sensores eletroquímico/semicondutor/infravermelho | **Não aprovado como NDIR**: “infravermelho” aparece, mas a página não mapeia o princípio ao CO₂ nem informa NDIR | R$156,62 + frete observado de R$20; vendedor Yunir-US | Só comprar após o vendedor fornecer ficha técnica confirmando CO₂ NDIR |

## Decisão recomendada para o protótipo

### Se um único aparelho for obrigatório

Escolheria o **BREATHE Airmonitor Plus** ou o **ATO-AIR-DM197**, desde que o vendedor confirme antes do pagamento que entrega no Brasil e informe o custo total. Ambos cobrem toda a matriz desejada, incluindo PM10, TVOC e HCHO.

### Se o teto de R$800–900 for rígido

A alternativa mais realista é aceitar uma arquitetura em dois níveis:

- **Temtop M10+** para CO₂ NDIR, PM2.5, TVOC, temperatura e umidade;
- um sensor PM10 separado apenas se PM10 for indispensável, ou usar PM2.5 como métrica principal de partículas no primeiro protótipo.

Se PM10 e TVOC tiverem prioridade maior que HCHO, tentar o **Temtop M100 2nd**; o preço base fica próximo do teto, mas não há margem para impostos e frete.

### Se compra nacional e suporte local forem prioritários

As opções verificadas localmente são insuficientes dentro do orçamento: o Temtop LKC-1000S+ custa R$1.190 e não mede CO₂; o M2000 2nd custa R$1.950. As ofertas brasileiras genéricas são baratas, mas frequentemente não comprovam CO₂ NDIR.

## Alertas técnicos

- “CO₂ equivalente”, “eCO₂” ou apenas “sensor infravermelho” sem especificar NDIR não atende ao requisito.
- TVOC/eTVOC baseado em índice de VOC é útil para tendência e detecção de eventos, mas não deve ser tratado como concentração laboratorial absoluta.
- PM10 em monitores baratos pode ser derivado/estimado a partir do canal de partículas; pedir no datasheet o método e a faixa do canal PM10.
- HCHO em monitores baratos é indicativo, não substitui uma medição de referência para laudo ou conformidade.
- Para o UFCIM, conectividade e exportação de dados importam tanto quanto a contagem de sensores: Wi-Fi/app é conveniente para o piloto; RS-485/Modbus ou API local seria melhor para integração durável.

## Links principais

- ATO-AIR-DM197: https://www.ato.com/indoor-air-quality-monitor
- ATO-AIR-DM601: https://www.ato.com/home-air-quality-monitor
- BREATHE Airmonitor Plus: https://breathe-tech.com/products/breathe-airmonitor-plus
- Temtop M100 2nd: https://temtopus.com/products/temtop-m100-2nd-wifi-air-quality-monitor-7-touch-screen-indoor-co2-pm2-5-pm10-tvoc-temperature-humidity-detector-smart-multi-room-air-analyzer-with-lora-expansion
- Temtop M10+: https://temtopus.com/products/temtop-m10-indoor-air-quality-monitor-6-in-1-co2-pm2-5-voc-detection-smart-temperature-humidity-sensor-with-app-connectivity-for-home-air-quality-testing-analysis
- Temtop M2000 2nd: https://temtopus.com/products/temtop-m2000-2nd-generation-air-quality-monitor-for-pm2-5-pm10-particles-co2-hcho-temperature-humidity-settable-audio-alarm-data-export-recording-curve-easy-calibration
- Qingping Air Monitor 2: https://www.qingping.co/air-monitor-2
- Sensirion SCD41: https://sensirion.com/products/catalog/SCD41
- Elitech Brasil: https://www.elitechbrasil.com.br/qualidade-do-ar/monitor-de-qualidade-do-ar-com-exportacao-de-dados
- Amazon Brasil — Yunir 6 em 1: https://www.amazon.com.br/Yunir-Qualidade-Detector-Eletroqu%C3%ADmico-Infravermelho/dp/B0G87LPG8G
