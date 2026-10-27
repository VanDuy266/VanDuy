FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
WORKDIR /app
COPY --chown=node:node googleb7e6f8e1f6a5ab6e.html ./
COPY --chown=node:node package.json sepay-gateway.js sepay-payments.js sepay-client.js admin-sidebar.js admin-sidebar.css policy-content.js sheets-button.js sheets-import.js sheets-views.js sheets-backup.js staff.js video-media.js seasonal.js v31.js v31-pages.js v31.css v31-client.js v31-admin.js reviews.js v3.css v3.js server.js pages.js commerce.js accounts.js product-viewer.js icons.js experience.css viewer.js viewer.css launch.js index.html shop.js style.css retail.css brand.css v2.css admin.html admin.js admin.css ./
COPY --chown=node:node admin-pages ./admin-pages
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node catalog ./catalog
COPY --chown=node:node assets ./assets
COPY --chown=node:node vendor ./vendor
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
