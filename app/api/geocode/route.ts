import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const {
            street,
            number,
            neighborhood,
            city,
            state,
            postalCode,
        } = body

        if (
            !street ||
            !number ||
            !city ||
            !state ||
            !postalCode
        ) {
            return NextResponse.json(
                {
                    error: 'Endereço incompleto.',
                },
                { status: 400 }
            )
        }

        if (city !== 'Itajaí' || state !== 'SC') {
            return NextResponse.json(
                {
                    error:
                        'No momento, o Atmô está disponível apenas em Itajaí - SC.',
                },
                { status: 400 }
            )
        }

        const params = new URLSearchParams({
            street: `${number} ${street}, ${neighborhood || ''}`,
            city,
            state,
            postalcode: postalCode,
            country: 'Brazil',
            format: 'jsonv2',
            limit: '1',
        })

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            {
                headers: {
                    'User-Agent':
                        'Atmo/1.0 (projeto-atmo)',
                },
                cache: 'no-store',
            }
        )

        if (!response.ok) {
            return NextResponse.json(
                {
                    error:
                        'Não foi possível consultar o serviço de geolocalização.',
                },
                { status: 502 }
            )
        }

        const data = await response.json()

        if (!data || data.length === 0) {
            return NextResponse.json(
                {
                    error:
                        'Não foi possível localizar este endereço.',
                },
                { status: 404 }
            )
        }

        const result = data[0]

        return NextResponse.json({
            latitude: Number(result.lat),
            longitude: Number(result.lon),
        })
    } catch (error) {
        console.error('Erro no geocoding:', error)

        return NextResponse.json(
            {
                error:
                    'Erro ao consultar o endereço.',
            },
            { status: 500 }
        )
    }
}