from brevo import Brevo
import os
from dotenv import load_dotenv
from brevo.transactional_emails import SendTransacEmailRequestSender, SendTransacEmailRequestToItem

load_dotenv()

DIRECCION_NEGOCIO = "a23300739@ceti.mx"
NOMBRE_NEGOCIO = "Cafe del L"

client = Brevo(
    api_key = os.getenv('BREVO-API-KEY')
)

async def enviar_correo_bienvenida(para: str, nombre: str):
    client.transactional_emails.send_transac_email(
        html_content=
        """
        <html>
        <body style="margin:0; padding:0; background-color:#f4ede4; font-family: Georgia, 'Times New Roman', serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4ede4; padding:32px 0;">
            <tr>
                <td align="center">
                <table role="presentation" width="100%" style="max-width:480px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    <!-- Encabezado -->
                    <tr>
                    <td align="center" style="background-color:#3c2415; padding:28px 20px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/8230/8230211.png" alt="Logo" width="56" height="56" style="display:block; margin-bottom:10px;">
                        <h1 style="margin:0; color:#f4ede4; font-size:26px; letter-spacing:1px;">Cafe del L</h1>
                    </td>
                    </tr>

                    <!-- Contenido -->
                    <tr>
                    <td style="padding:32px 28px;">
                        <h2 style="margin:0 0 12px; color:#3c2415; font-size:20px;">
                        Bienvenido, {{params.nombre}}
                        </h2>
                        <h3 style="margin:0 0 16px; color:#8a6240; font-size:16px; font-weight:normal;">
                        Estamos muy felices de que seas parte de la Cafe del L
                        </h3>
                        <p style="margin:0 0 24px; color:#555555; font-size:15px; line-height:1.6;">
                        Lo mejor está por venir, encuentra los mejores platillos para saciar tu hambre...
                        </p>

                        <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="background-color:#3c2415; border-radius:6px;">
                            <a href="https://la-del-l.netlify.app" style="display:inline-block; padding:12px 28px; color:#f4ede4; text-decoration:none; font-size:15px; font-weight:bold;">AQUÍ</a>
                            </td>
                        </tr>
                        </table>
                    </td>
                    </tr>

                </table>
                </td>
            </tr>
            </table>
        </body>
        </html>
        """,
        params={
            "nombre": nombre
        },
        sender=SendTransacEmailRequestSender(
            email=DIRECCION_NEGOCIO,
            name=NOMBRE_NEGOCIO,
        ),
        subject="¡Bienvenido!",
        to=[
            SendTransacEmailRequestToItem(
                email=para,
                name=nombre,
            )
        ],
    )

async def enviar_correo_pedido_generado(para: str, nombre: str, html):
    client.transactional_emails.send_transac_email(
        html_content=html,
        sender=SendTransacEmailRequestSender(
            email=DIRECCION_NEGOCIO,
            name=NOMBRE_NEGOCIO,
        ),
        subject="¡Gracias por su Compra!",
        to=[
            SendTransacEmailRequestToItem(
                email=para,
                name=nombre,
            )
        ],
    )

async def enviar_correo_status_pedido(para: str, nombre: str, html, status: str):
    client.transactional_emails.send_transac_email(
        html_content=html,
        sender=SendTransacEmailRequestSender(
            email=DIRECCION_NEGOCIO,
            name=NOMBRE_NEGOCIO,
        ),
        subject=f"¡Pedido {status}!",
        to=[
            SendTransacEmailRequestToItem(
                email=para,
                name=nombre,
            )
        ],
    )

def crear_html_new_pedido(dict_data) -> str:
    if not dict_data:
        return ""

    name = dict_data[0]["usuario_nombre"]
    pedido_id = dict_data[0]["id"]
    total = dict_data[0]["total"]

    detalles_html = []

    for detalle in dict_data:
        detalles_html.append(f"""
            <tr>
                <td style="padding:10px 12px; border-bottom:1px solid #eee; color:#444; font-size:14px;">{detalle["producto_nombre"]}</td>
                <td align="center" style="padding:10px 12px; border-bottom:1px solid #eee; color:#444; font-size:14px;">{detalle["cantidad"]}</td>
                <td align="right" style="padding:10px 12px; border-bottom:1px solid #eee; color:#444; font-size:14px;">${detalle["importe"]}</td>
            </tr>
        """)

    html = f"""
    <html>
    <body style="margin:0; padding:0; background-color:#f4ede4; font-family: Georgia, 'Times New Roman', serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4ede4; padding:32px 0;">
        <tr>
            <td align="center">
            <table role="presentation" width="100%" style="max-width:520px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <!-- Encabezado -->
                <tr>
                <td align="center" style="background-color:#3c2415; padding:28px 20px;">
                    <img src="https://cdn-icons-png.flaticon.com/512/8230/8230211.png" alt="Logo" width="56" height="56" style="display:block; margin-bottom:10px;">
                    <h1 style="margin:0; color:#f4ede4; font-size:26px; letter-spacing:1px;">Cafe del L</h1>
                </td>
                </tr>

                <!-- Contenido -->
                <tr>
                <td style="padding:32px 28px;">
                    <h2 style="margin:0 0 8px; color:#3c2415; font-size:20px;">Hola, {name}</h2>
                    <h3 style="margin:0 0 24px; color:#8a6240; font-size:16px; font-weight:normal;">Su pedido #{pedido_id} se generó correctamente</h3>

                    <h4 style="margin:0 0 12px; color:#3c2415; font-size:15px;">Pedido:</h4>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;">
                    <thead>
                        <tr>
                        <th align="left" style="padding:10px 12px; background-color:#f4ede4; color:#3c2415; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Producto</th>
                        <th align="center" style="padding:10px 12px; background-color:#f4ede4; color:#3c2415; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Cantidad</th>
                        <th align="right" style="padding:10px 12px; background-color:#f4ede4; color:#3c2415; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {''.join(detalles_html)}
                    </tbody>
                    </table>

                    <h4 style="margin:0 0 24px; text-align:right; color:#3c2415; font-size:18px;">Total: ${total}</h4>

                    <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="background-color:#3c2415; border-radius:6px;">
                        <a href="https://la-del-l.netlify.app" style="display:inline-block; padding:12px 28px; color:#f4ede4; text-decoration:none; font-size:15px; font-weight:bold;">Siga comprando AQUÍ</a>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>
    </body>
    </html>
    """

    return html

def crear_html_pedido_changed_status(dict_data) -> str:
    if not dict_data:
        return ""
    
    root_order = dict_data[0]
    html = ""

    name = root_order["usuario_nombre"]
    pedido_id = root_order["id"]
    status = root_order["status"]
    total = root_order["total"]
    fecha_entrega = root_order["fecha_entrega"] or "Sin fecha de entrega"

    detalles_html = []

    for detalle in dict_data:
        detalles_html.append(f"""
            <tr>
                <td style="padding:10px 12px; border-bottom:1px solid #eee; color:#444; font-size:14px;">{detalle["producto_nombre"]}</td>
                <td align="center" style="padding:10px 12px; border-bottom:1px solid #eee; color:#444; font-size:14px;">{detalle["cantidad"]}</td>
                <td align="right" style="padding:10px 12px; border-bottom:1px solid #eee; color:#444; font-size:14px;">${detalle["importe"]}</td>
            </tr>
        """)

    color_status = "#b23b3b" if status == "CANCELADO" else "#3c2415"

    html = f"""
        <html>
            <body style="margin:0; padding:0; background-color:#f4ede4; font-family: Georgia, 'Times New Roman', serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4ede4; padding:32px 0;">
                <tr>
                <td align="center">
                    <table role="presentation" width="100%" style="max-width:520px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                    <!-- Encabezado -->
                    <tr>
                        <td align="center" style="background-color:#3c2415; padding:28px 20px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/8230/8230211.png" alt="Logo" width="56" height="56" style="display:block; margin-bottom:10px;">
                        <h1 style="margin:0; color:#f4ede4; font-size:26px; letter-spacing:1px;">Cafe del L</h1>
                        </td>
                    </tr>

                    <!-- Contenido -->
                    <tr>
                        <td style="padding:32px 28px;">
                        <h2 style="margin:0 0 8px; color:#3c2415; font-size:20px;">Hola, {name}</h2>
                        <h3 style="margin:0 0 16px; color:{color_status}; font-size:16px; font-weight:bold;">Su pedido #{pedido_id} está {status}</h3>

                        {"<p style='margin:0 0 20px; color:#b23b3b; font-size:14px;'>Lamentamos los inconvenientes :(</p>" if status == "CANCELADO" else ""}

                        {f"<p style='margin:0 0 20px; color:#555555; font-size:14px;'>Fecha y hora de entrega: {fecha_entrega}</p>" if fecha_entrega != "Sin fecha de entrega" and status == "EN PROCESO" else ""}

                        <h4 style="margin:0 0 12px; color:#3c2415; font-size:15px;">Pedido:</h4>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;">
                            <thead>
                            <tr>
                                <th align="left" style="padding:10px 12px; background-color:#f4ede4; color:#3c2415; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Producto</th>
                                <th align="center" style="padding:10px 12px; background-color:#f4ede4; color:#3c2415; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Cantidad</th>
                                <th align="right" style="padding:10px 12px; background-color:#f4ede4; color:#3c2415; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Importe</th>
                            </tr>
                            </thead>
                            <tbody>
                            {''.join(detalles_html)}
                            </tbody>
                        </table>

                        <h4 style="margin:0 0 24px; text-align:right; color:#3c2415; font-size:18px;">Total: ${total}</h4>

                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                            <td align="center" style="background-color:#3c2415; border-radius:6px;">
                                <a href="https://la-del-l.netlify.app" style="display:inline-block; padding:12px 28px; color:#f4ede4; text-decoration:none; font-size:15px; font-weight:bold;">Siga comprando AQUÍ</a>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>

                    </table>
                </td>
                </tr>
            </table>
            </body>
        </html>
        """
        
    return html