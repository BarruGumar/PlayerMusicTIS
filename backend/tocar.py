from playsound import playsound
import sys
import os

def tocar_musica(ficheiro):
    if not os.path.isfile(ficheiro):
        print(f"Erro: O ficheiro não existe.",ficheiro)
        return

    print(f"Reproduzindo música:", ficheiro)
    playsound(ficheiro)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python tocar.py <caminho_do_ficheiro>")
        sys.exit(1)

    caminho_ficheiro = sys.argv[1]
    tocar_musica(caminho_ficheiro)