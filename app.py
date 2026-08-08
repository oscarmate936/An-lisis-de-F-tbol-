"""Punto de entrada de Streamlit para Pizarra — terminal de análisis.

La app es una SPA de React/Babel que se conecta directamente a
API-Football desde el navegador (la clave se guarda en el propio
navegador, nunca pasa por este servidor). Streamlit solo la aloja
dentro de un componente HTML.
"""
import streamlit as st
import streamlit.components.v1 as components

from build_frontend import build_html

st.set_page_config(
    page_title="Pizarra — terminal de análisis",
    page_icon="⚽",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# La interfaz ya trae su propia cabecera y fondo oscuro; se quita el
# recuadro y el padding por defecto de Streamlit para que no se note
# que está dentro de un componente.
#
# header[data-testid="stHeader"] es una barra fija que Streamlit dibuja
# ENCIMA de todo, incluido el iframe: aunque quede transparente, sigue
# capturando los clics de lo que tenga debajo. Como esta app no usa
# ningún widget nativo de Streamlit, se oculta del todo (junto al menú
# y el pie "Made with Streamlit") para que los botones de la interfaz
# —el de Ajustes entre ellos— reciban el clic de verdad.
st.markdown(
    """
    <style>
        body, .stApp {background: #0B0B0D;}
        div.block-container {padding: 0 !important; max-width: 100% !important;}
        header[data-testid="stHeader"] {display: none;}
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}
        iframe {min-height: 100vh;}
    </style>
    """,
    unsafe_allow_html=True,
)

# El manifest y los iconos se enganchan en la propia página de
# Streamlit (servida como estática gracias a enableStaticServing en
# .streamlit/config.toml), no en el iframe donde vive la SPA: es esta
# página, con la app dentro, la que se "añade a la pantalla de
# inicio" o se guarda como marcador.
#
# Queda fuera, a propósito, un service worker: se probó de verdad
# (no solo se asumió) y Chrome lo rechaza con SecurityError en cuanto
# se le pide un scope que cubra "/" — el máximo que deja un script
# servido en app/static/ es app/static/, que no llega a cubrir la
# página real. Sin service worker con ese alcance no hay instalación
# completa (ventana propia, sin barra del navegador): lo que sí
# consigue esto es que el icono y el nombre salgan bien al guardarla
# como acceso directo o marcador.
st.markdown(
    """
    <link rel="manifest" href="app/static/manifest.json">
    <link rel="icon" href="app/static/icon-192.png">
    <link rel="apple-touch-icon" href="app/static/icon-192.png">
    <meta name="theme-color" content="#0F1116">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Pizarra">
    """,
    unsafe_allow_html=True,
)

components.html(build_html(), height=960, scrolling=True)
