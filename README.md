# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye los power-ups **Velocidad**, que duplica temporalmente la velocidad de la nave, y **Triple Shot**, que dispara tres balas en abanico, el **escudo** manual que protege de los impactos, y la **estrella fugaz**, un asteroide veloz que desaparece con el tiempo.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave     |
| `↑`       | Propulsar      |
| `Espacio` | Disparar       |
| `S`       | Activar escudo |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |
| Estrella fugaz | 150 |

## Estrella fugaz

De vez en cuando aparece desde un borde de la pantalla una estrella fugaz: un asteroide pequeño que se mueve al triple de velocidad que uno normal, con una estela cian. Parpadea en sus últimos instantes y desaparece solo tras 7–10 segundos. No se parte en fragmentos y otorga 150 puntos. Solo puede haber una activa a la vez y aparece cada 12–20 segundos.

## Power-ups

| Power-up     | Efecto                                                              |
| ------------ | ------------------------------------------------------------------- |
| ⚡ Velocidad  | Duplica la velocidad de la nave durante 5 segundos                  |
| 🔱 Triple Shot | Dispara 3 balas en abanico durante 5 segundos                      |

Al destruir un asteroide hay un 15% de probabilidad de que suelte un power-up, elegido al 50% entre Velocidad (amarillo) y Triple Shot (cian). Se recoge pasando por encima con la nave, desaparece a los 10 segundos si no se recoge y puede haber como máximo dos activos a la vez. Recoger otro mientras el efecto está activo reinicia el contador a 5 segundos. Ambos efectos pueden estar activos a la vez y sus contadores son independientes.

## Escudo

Pulsa `S` para activar un escudo cian alrededor de la nave. Dura 8 segundos y, mientras esté activo, absorbe cualquier impacto con un asteroide (también con la estrella fugaz): el asteroide rebota y se separa sin destruirse ni otorgar puntos. Al agotarse, el escudo tarda 10 segundos en recargarse. Se pierde al morir o al cambiar de nivel.

El HUD muestra `ESCUDO [S]` cuando está listo, la cuenta atrás mientras está activo y el tiempo restante de recarga.

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-up Velocidad: duplica el empuje de la nave durante 5 segundos
- Power-up Triple Shot: dispara 3 balas en abanico durante 5 segundos
- Escudo manual: 8 segundos de protección con 10 segundos de recarga
- Estrella fugaz: asteroide veloz y temporal que no se divide
