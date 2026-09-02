FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/samples ./samples
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4317
EXPOSE 4317
CMD ["node", "dist/server/entrypoints/server.js"]
