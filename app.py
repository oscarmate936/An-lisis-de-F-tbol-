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

components.html(build_html(), height=960, scrolling=True)
