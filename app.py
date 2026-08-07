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
st.markdown(
    """
    <style>
        div.block-container {padding: 0 !important; max-width: 100% !important;}
        header[data-testid="stHeader"] {background: transparent;}
        iframe {min-height: 100vh;}
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(build_html(), height=1600, scrolling=True)
