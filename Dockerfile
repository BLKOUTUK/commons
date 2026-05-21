FROM nginx:alpine

# Custom nginx config (static, gzip, cache headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static content
COPY public/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
