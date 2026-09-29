function CategoriaItem({ categoria, onSeleccionar }) {
  return (
    <li onClick={() => onSeleccionar(categoria)}>
      {categoria.nombre}
    </li>
  );
}

export default CategoriaItem;