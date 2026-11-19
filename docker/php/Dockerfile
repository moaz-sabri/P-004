FROM php:8.4-fpm-alpine

# Install system dependencies and build tools
RUN apk update && apk add --no-cache \
    tzdata \
    bash \
    curl \
    mysql-client

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mysqli opcache

# Configure PHP settings
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
    sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 32M/g' "$PHP_INI_DIR/php.ini" && \
    sed -i 's/post_max_size = 8M/post_max_size = 32M/g' "$PHP_INI_DIR/php.ini" && \
    sed -i 's/memory_limit = 128M/memory_limit = 256M/g' "$PHP_INI_DIR/php.ini" && \
    sed -i 's/;date.timezone =/date.timezone = UTC/g' "$PHP_INI_DIR/php.ini"

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
