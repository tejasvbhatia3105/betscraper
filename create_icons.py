#!/usr/bin/env python3
import base64

# Simple PNG data for a small colored square
png_data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGBgAAAABQABXvMqOgAAAABJRU5ErkJggg=='

def create_icon(size):
    filename = f'icons/icon{size}.png'
    with open(filename, 'wb') as f:
        f.write(base64.b64decode(png_data))
    print(f'Created {filename}')

# Create all required icon sizes
for size in [16, 32, 48, 128]:
    create_icon(size)

print('All placeholder icons created successfully!')
print('The extension is now ready to load in Chrome.') 