String brl(double value) =>
    'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';
