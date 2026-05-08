import { useState, useEffect } from "react";

export interface Pasta {
  id: string;
  nome: string;
  cor: string;
}

export interface FavoritoNoticia {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  data: string;
  pastaId: string;
  tipo: "noticia";
}

export interface FavoritoCurso {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  pastaId: string;
  tipo: "curso";
}

export type Favorito = FavoritoNoticia | FavoritoCurso;

const useFavoritos = () => {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  // Carregar dados do localStorage
  useEffect(() => {
    const pastasStorage = localStorage.getItem("pastas");
    const favoritosStorage = localStorage.getItem("favoritos");

    if (pastasStorage) {
      setPastas(JSON.parse(pastasStorage));
    } else {
      // Criar pasta padrão
      const pastaDefault: Pasta = {
        id: "default",
        nome: "Meus Favoritos",
        cor: "#8B5CF6"
      };
      setPastas([pastaDefault]);
      localStorage.setItem("pastas", JSON.stringify([pastaDefault]));
    }

    if (favoritosStorage) {
      setFavoritos(JSON.parse(favoritosStorage));
    }
  }, []);

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    if (pastas.length > 0) {
      localStorage.setItem("pastas", JSON.stringify(pastas));
    }
  }, [pastas]);

  useEffect(() => {
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
  }, [favoritos]);

  const criarPasta = (nome: string, cor: string) => {
    const novaPasta: Pasta = {
      id: Date.now().toString(),
      nome,
      cor
    };
    setPastas([...pastas, novaPasta]);
    return novaPasta;
  };

  const editarPasta = (id: string, nome: string, cor: string) => {
    setPastas(pastas.map(pasta => 
      pasta.id === id ? { ...pasta, nome, cor } : pasta
    ));
  };

  const excluirPasta = (id: string) => {
    if (id === "default") return; // Não permite excluir pasta padrão
    
    // Move todos os itens da pasta para a pasta padrão
    setFavoritos(favoritos.map(fav => 
      fav.pastaId === id ? { ...fav, pastaId: "default" } : fav
    ));
    
    // Remove a pasta
    setPastas(pastas.filter(pasta => pasta.id !== id));
  };

  const moverItem = (itemId: number, tipoItem: "noticia" | "curso", novaPastaId: string) => {
    setFavoritos(favoritos.map(fav => 
      fav.id === itemId && fav.tipo === tipoItem 
        ? { ...fav, pastaId: novaPastaId } 
        : fav
    ));
  };

  const adicionarFavorito = (item: Omit<Favorito, "pastaId">, pastaId: string = "default") => {
    const novoFavorito = {
      ...item,
      pastaId
    } as Favorito;
    setFavoritos([...favoritos, novoFavorito]);
  };

  const removerFavorito = (id: number, tipo: "noticia" | "curso") => {
    setFavoritos(favoritos.filter(fav => !(fav.id === id && fav.tipo === tipo)));
  };

  const isFavorito = (id: number, tipo: "noticia" | "curso") => {
    return favoritos.some(fav => fav.id === id && fav.tipo === tipo);
  };

  const getFavoritosPorPasta = (pastaId: string) => {
    return favoritos.filter(fav => fav.pastaId === pastaId);
  };

  return {
    pastas,
    favoritos,
    criarPasta,
    editarPasta,
    excluirPasta,
    adicionarFavorito,
    removerFavorito,
    moverItem,
    isFavorito,
    getFavoritosPorPasta
  };
};

export default useFavoritos;