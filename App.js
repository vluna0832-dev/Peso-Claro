import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@peso_claro_v1';
const COLORS = {
  navy: '#102C40', navy2: '#183D53', green: '#159B68', greenDark: '#10734E',
  greenPale: '#EAF6EF', bluePale: '#EDF3F8', bg: '#F5F7F8', white: '#FFFFFF',
  text: '#172B3A', muted: '#71808C', border: '#E3E9ED', red: '#D65353',
  redPale: '#FCEEEE', amber: '#D99A2B'
};
const CATEGORIES = ['Comida', 'Transporte', 'Hogar', 'Servicios', 'Salud', 'Entretenimiento', 'Compras', 'Salario', 'Venta', 'Otros'];
const money = (value, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency, maximumFractionDigits: 2
}).format(Number(value) || 0);
const dateLabel = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};
const todayISO = () => new Date().toISOString();

const DEFAULT_DATA = {
  transactions: [], exchangeRate: '17.50', savingsGoal: '10000',
  savings: 0, foodBudget: '1500', payments: []
};

function Button({ title, onPress, variant = 'primary', style, small = false }) {
  return <TouchableOpacity activeOpacity={0.82} onPress={onPress}
    style={[styles.button, variant === 'secondary' && styles.buttonSecondary,
      variant === 'ghost' && styles.buttonGhost, variant === 'danger' && styles.buttonDanger,
      small && styles.buttonSmall, style]}>
    <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextDark, small && styles.buttonTextSmall]}>{title}</Text>
  </TouchableOpacity>;
}
function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }
function SectionTitle({ children, action, onAction }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{children}</Text>
    {action ? <TouchableOpacity onPress={onAction}><Text style={styles.link}>{action}</Text></TouchableOpacity> : null}
  </View>;
}
function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', style }) {
  return <View style={[styles.fieldWrap, style]}><Text style={styles.fieldLabel}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor="#9AA6AE" keyboardType={keyboardType} style={styles.input} />
  </View>;
}
function Empty({ title, subtitle }) {
  return <View style={styles.empty}><Text style={styles.emptyIcon}>◷</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{subtitle}</Text></View>;
}
function TransactionRow({ item, rate, onDelete }) {
  const isIncome = item.type === 'income';
  const mxn = item.currency === 'USD' ? Number(item.amount) * rate : Number(item.amount);
  return <View style={styles.transactionRow}>
    <View style={[styles.transactionIcon, { backgroundColor: isIncome ? COLORS.greenPale : COLORS.redPale }]}>
      <Text style={{ color: isIncome ? COLORS.greenDark : COLORS.red, fontSize: 19, fontWeight: '800' }}>{isIncome ? '＋' : '−'}</Text>
    </View>
    <View style={styles.transactionInfo}>
      <Text style={styles.transactionTitle} numberOfLines={1}>{item.concept}</Text>
      <Text style={styles.transactionMeta}>{item.category} · {dateLabel(item.date)} · {item.currency}</Text>
    </View>
    <View style={styles.transactionRight}>
      <Text style={[styles.transactionAmount, { color: isIncome ? COLORS.greenDark : COLORS.text }]}>
        {isIncome ? '+' : '−'}{money(item.amount, item.currency)}
      </Text>
      {item.currency === 'USD' ? <Text style={styles.converted}>{money(mxn)} MXN</Text> : null}
    </View>
    {onDelete ? <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteHit}><Text style={styles.deleteText}>×</Text></TouchableOpacity> : null}
  </View>;
}

const RECIPE_CATALOG = [
  { name: 'Arroz con huevo y verduras', cost: 48, time: '20 min', ingredients: ['arroz','huevo','zanahoria','calabacita'], steps: 'Cuece el arroz. Saltea las verduras picadas, agrega el huevo y sirve.' },
  { name: 'Tostadas de frijoles', cost: 42, time: '15 min', ingredients: ['tostadas','frijoles','lechuga','jitomate','queso'], steps: 'Calienta los frijoles, úntalos en las tostadas y agrega lechuga, jitomate y queso.' },
  { name: 'Pasta roja sencilla', cost: 55, time: '25 min', ingredients: ['pasta','jitomate','cebolla','ajo'], steps: 'Cuece la pasta. Licúa jitomate, cebolla y ajo; cocina la salsa y mezcla.' },
  { name: 'Avena con plátano', cost: 25, time: '10 min', ingredients: ['avena','leche','plátano'], steps: 'Calienta la avena con leche o agua y termina con plátano en rodajas.' },
  { name: 'Quesadillas de papa', cost: 38, time: '25 min', ingredients: ['tortillas','papa','queso'], steps: 'Cuece y machaca la papa. Rellena las tortillas con papa y queso y dóralas.' },
  { name: 'Lentejas guisadas', cost: 50, time: '35 min', ingredients: ['lentejas','zanahoria','jitomate','cebolla'], steps: 'Cuece las lentejas. Agrega verduras picadas y cocina hasta que estén suaves.' },
  { name: 'Calabacitas con elote', cost: 44, time: '20 min', ingredients: ['calabacita','elote','cebolla','jitomate'], steps: 'Sofríe cebolla y jitomate, agrega calabacita y elote; tapa hasta suavizar.' },
  { name: 'Sopa de verduras', cost: 40, time: '30 min', ingredients: ['zanahoria','papa','calabacita','chayote','fideo'], steps: 'Pica las verduras, sofríelas ligeramente, agrega agua y cocina hasta suavizar.' },
  { name: 'Tacos de papa', cost: 36, time: '25 min', ingredients: ['tortillas','papa','lechuga','salsa'], steps: 'Cuece y machaca la papa. Rellena tortillas, dóralas y acompaña con lechuga y salsa.' },
  { name: 'Enfrijoladas', cost: 46, time: '20 min', ingredients: ['tortillas','frijoles','queso','cebolla'], steps: 'Licúa frijoles con un poco de agua, calienta la salsa y baña las tortillas. Agrega queso y cebolla.' },
  { name: 'Arroz a la mexicana', cost: 32, time: '25 min', ingredients: ['arroz','jitomate','zanahoria','chícharos','cebolla'], steps: 'Dora el arroz, añade jitomate licuado y verduras. Agrega agua y cocina tapado.' },
  { name: 'Omelette de verduras', cost: 39, time: '12 min', ingredients: ['huevo','jitomate','cebolla','espinaca','queso'], steps: 'Bate los huevos, vierte en sartén y agrega verduras y queso. Dobla cuando cuaje.' },
  { name: 'Tortitas de atún', cost: 58, time: '20 min', ingredients: ['atún','huevo','avena','cebolla'], steps: 'Mezcla atún escurrido con huevo, avena y cebolla. Forma tortitas y dóralas.' },
  { name: 'Papas con chorizo', cost: 52, time: '25 min', ingredients: ['papa','chorizo','cebolla','tortillas'], steps: 'Cuece las papas en cubos. Dora el chorizo con cebolla, agrega papa y mezcla.' },
  { name: 'Sincronizadas', cost: 49, time: '10 min', ingredients: ['tortillas','jamón','queso'], steps: 'Coloca jamón y queso entre dos tortillas y calienta por ambos lados.' },
  { name: 'Ensalada de atún', cost: 55, time: '15 min', ingredients: ['atún','jitomate','pepino','lechuga','limón'], steps: 'Escurre el atún, mezcla con verduras picadas y agrega limón.' },
  { name: 'Sopa de fideo', cost: 30, time: '20 min', ingredients: ['fideo','jitomate','cebolla','ajo'], steps: 'Dora el fideo. Agrega jitomate licuado con cebolla y ajo, añade agua y cocina.' },
  { name: 'Molletes económicos', cost: 45, time: '15 min', ingredients: ['bolillo','frijoles','queso','jitomate'], steps: 'Parte el bolillo, unta frijoles, agrega queso y calienta. Acompaña con jitomate.' },
  { name: 'Plátano con avena', cost: 28, time: '10 min', ingredients: ['plátano','avena','leche','canela'], steps: 'Cocina la avena con leche y canela. Sirve con plátano en rodajas.' },
  { name: 'Caldo de pollo rendidor', cost: 68, time: '40 min', ingredients: ['pollo','papa','zanahoria','calabacita','arroz'], steps: 'Cuece el pollo. Agrega verduras y arroz; cocina hasta que todo esté suave.' }
];

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('Inicio');
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState('expense');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('Comida');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [filter, setFilter] = useState('Todos');
  const [savingInput, setSavingInput] = useState('');
  const [rateInput, setRateInput] = useState('17.50');
  const [goalInput, setGoalInput] = useState('10000');
  const [foodInput, setFoodInput] = useState('1500');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [leftoverInput, setLeftoverInput] = useState('');
  const [recipeLimitInput, setRecipeLimitInput] = useState('');
  const [recipeServings, setRecipeServings] = useState('2');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = { ...DEFAULT_DATA, ...JSON.parse(raw) };
          setData(parsed);
          setRateInput(String(parsed.exchangeRate));
          setGoalInput(String(parsed.savingsGoal));
          setFoodInput(String(parsed.foodBudget));
        }
      } catch (e) { Alert.alert('Aviso', 'No se pudieron cargar los datos guardados.'); }
      finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() =>
      Alert.alert('Error', 'No se pudieron guardar los datos en el dispositivo.'));
  }, [data, loaded]);

  const rate = Math.max(0, Number(data.exchangeRate) || 0);
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    data.transactions.forEach(t => {
      const value = Number(t.amount) * (t.currency === 'USD' ? rate : 1);
      if (t.type === 'income') income += value; else expense += value;
    });
    return { income, expense, balance: income - expense - (Number(data.savings) || 0) };
  }, [data.transactions, data.savings, rate]);

  const addTransaction = () => {
    const value = Number(amount.replace(',', '.'));
    if (!concept.trim()) return Alert.alert('Falta el concepto', 'Escribe qué movimiento deseas registrar.');
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('Monto no válido', 'Escribe una cantidad mayor que cero.');
    const item = { id: String(Date.now()), type, concept: concept.trim(), category, amount: value, currency, date: todayISO() };
    setData(prev => ({ ...prev, transactions: [item, ...prev.transactions] }));
    setConcept(''); setAmount(''); setCategory('Comida'); setCurrency('MXN'); setType('expense'); setModalVisible(false);
  };
  const deleteTransaction = (id) => Alert.alert('Eliminar movimiento', '¿Quieres eliminar este movimiento?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) })) }
  ]);
  const addSaving = () => {
    const value = Number(savingInput.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('Monto no válido', 'Escribe una cantidad mayor que cero.');
    if (value > totals.balance) return Alert.alert('Saldo insuficiente', 'El ahorro no puede superar tu saldo disponible.');
    setData(prev => ({ ...prev, savings: Number(prev.savings || 0) + value }));
    setSavingInput('');
    Alert.alert('¡Ahorro agregado!', `Se sumaron ${money(value)} a tu ahorro.`);
  };
  const saveSettings = () => {
    const r = Number(rateInput.replace(',', '.'));
    const g = Number(goalInput.replace(',', '.'));
    const f = Number(foodInput.replace(',', '.'));
    if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(g) || g <= 0 || !Number.isFinite(f) || f < 0)
      return Alert.alert('Revisa los valores', 'El tipo de cambio y la meta deben ser mayores que cero. El presupuesto de comida no puede ser negativo.');
    setData(prev => ({ ...prev, exchangeRate: String(r), savingsGoal: String(g), foodBudget: String(f) }));
    Alert.alert('Guardado', 'Tus ajustes se actualizaron.');
  };

  const addPayment = () => {
    const value = Number(paymentAmount.replace(',', '.'));
    if (!paymentName.trim()) return Alert.alert('Falta el nombre', 'Escribe el nombre del pago o deuda.');
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('Monto no válido', 'Escribe una cantidad mayor que cero.');
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(paymentDate) || Number.isNaN(new Date(`${paymentDate}T12:00:00`).getTime()))
      return Alert.alert('Fecha no válida', 'Usa el formato AAAA-MM-DD, por ejemplo 2026-11-15.');
    const item = { id: String(Date.now()), name: paymentName.trim(), amount: value, currency: paymentCurrency, dueDate: paymentDate, paid: false, createdAt: todayISO() };
    setData(prev => ({ ...prev, payments: [item, ...(prev.payments || [])] }));
    setPaymentName(''); setPaymentAmount(''); setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentCurrency('MXN'); setPaymentModalVisible(false);
  };

  const markPaymentPaid = (item) => {
    Alert.alert('Marcar como pagado', `¿Confirmas que pagaste ${item.name}? Se registrará también como gasto.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, pagué', onPress: () => {
        const expense = {
          id: `payment-${item.id}`, type: 'expense', concept: item.name,
          category: 'Servicios', amount: item.amount, currency: item.currency,
          date: todayISO()
        };
        setData(prev => ({
          ...prev,
          payments: (prev.payments || []).map(p => p.id === item.id ? { ...p, paid: true, paidAt: todayISO() } : p),
          transactions: [expense, ...prev.transactions]
        }));
      }}
    ]);
  };

  const deletePayment = (id) => Alert.alert('Eliminar pago', '¿Quieres eliminar este pago o deuda?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => setData(prev => ({ ...prev, payments: (prev.payments || []).filter(p => p.id !== id) })) }
  ]);

  const paymentStatus = (date, paid) => {
    if (paid) return 'Pagado';
    const today = new Date().toISOString().slice(0, 10);
    return date < today ? 'Vencido' : date === today ? 'Vence hoy' : 'Pendiente';
  };

  const filteredTransactions = data.transactions.filter(t => filter === 'Todos' || (filter === 'Ingresos' ? t.type === 'income' : t.type === 'expense'));
  const progress = Math.min(1, (Number(data.savings) || 0) / Math.max(1, Number(data.savingsGoal) || 1));
  const foodBudget = Math.max(0, Number(data.foodBudget) || 0);
  const monthKey = new Date().toISOString().slice(0, 7);
  const foodSpentThisMonth = data.transactions.reduce((sum, t) => {
    if (t.type !== 'expense' || t.category !== 'Comida' || String(t.date || '').slice(0, 7) !== monthKey) return sum;
    return sum + Number(t.amount || 0) * (t.currency === 'USD' ? rate : 1);
  }, 0);
  const remainingFoodBudget = Math.max(0, foodBudget - foodSpentThisMonth);
  const recipeLimit = recipeLimitInput.trim() === '' ? remainingFoodBudget : Math.max(0, Number(recipeLimitInput.replace(',', '.')) || 0);
  const servings = Math.max(1, Math.min(12, Number.parseInt(recipeServings, 10) || 2));
  const leftoverTerms = leftoverInput.toLocaleLowerCase('es-MX').split(',').map(x => x.trim()).filter(Boolean);
  const searchTerm = recipeSearch.trim().toLocaleLowerCase('es-MX');
  const availableRecipes = RECIPE_CATALOG.filter(r => {
    const matchesSearch = !searchTerm || r.name.toLocaleLowerCase('es-MX').includes(searchTerm) || r.ingredients.some(x => x.includes(searchTerm));
    const matchesLeftovers = !leftoverTerms.length || r.ingredients.some(ingredient => leftoverTerms.some(term => ingredient.includes(term) || term.includes(ingredient)));
    return matchesSearch && matchesLeftovers && r.cost * servings / 2 <= recipeLimit;
  }).map(r => ({ ...r, displayCost: Math.round(r.cost * servings / 2) }));
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentCurrency, setPaymentCurrency] = useState('MXN');

  const Header = ({ subtitle }) => <View style={styles.topHeader}>
    <View><Text style={styles.brand}>Peso <Text style={{ color: COLORS.green }}>Claro</Text></Text>
      <Text style={styles.headerSubtitle}>{subtitle}</Text></View>
    <View style={styles.avatar}><Text style={styles.avatarText}>$</Text></View>
  </View>;

  const renderHome = () => <ScrollView contentContainerStyle={styles.page}>
    <Header subtitle="Tus finanzas, bajo control" />
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>SALDO DISPONIBLE</Text>
      <Text style={styles.balanceValue}>{money(totals.balance)}</Text>
      <Text style={styles.balanceFoot}>Pesos mexicanos · USD convertido a MXN</Text>
      <View style={styles.balanceLine} />
      <View style={styles.balanceStats}>
        <View><Text style={styles.balanceStatLabel}>Ingresos</Text><Text style={styles.balanceStatValue}>{money(totals.income)}</Text></View>
        <View><Text style={styles.balanceStatLabel}>Gastos</Text><Text style={styles.balanceStatValue}>{money(totals.expense)}</Text></View>
      </View>
    </View>
    <View style={styles.summaryGrid}>
      <Card style={styles.summaryCard}><Text style={styles.summaryLabel}>Ingresos</Text><Text style={[styles.summaryValue, { color: COLORS.greenDark }]}>{money(totals.income)}</Text><Text style={styles.summaryHint}>Total registrado</Text></Card>
      <Card style={styles.summaryCard}><Text style={styles.summaryLabel}>Gastos</Text><Text style={styles.summaryValue}>{money(totals.expense)}</Text><Text style={styles.summaryHint}>Total registrado</Text></Card>
    </View>
    <View style={styles.quickActions}>
      <Button title="+ Agregar ingreso" onPress={() => { setType('income'); setModalVisible(true); }} style={{ flex: 1 }} />
      <Button title="− Agregar gasto" onPress={() => { setType('expense'); setModalVisible(true); }} variant="secondary" style={{ flex: 1 }} />
    </View>
    <SectionTitle action="Ver todos" onAction={() => setTab('Movimientos')}>Movimientos recientes</SectionTitle>
    <Card style={{ paddingHorizontal: 14 }}>
      {data.transactions.length ? data.transactions.slice(0, 4).map(item => <TransactionRow key={item.id} item={item} rate={rate} />) :
        <Empty title="Aún no hay movimientos" subtitle="Agrega tu primer ingreso o gasto para comenzar." />}
    </Card>
    <SectionTitle>Tu ahorro</SectionTitle>
    <Card>
      <View style={styles.rowBetween}><Text style={styles.muted}>Ahorrado</Text><Text style={styles.bold}>{money(data.savings)}</Text></View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      <Text style={styles.smallMuted}>{Math.round(progress * 100)}% de tu meta de {money(data.savingsGoal)}</Text>
    </Card>
  </ScrollView>;

  const renderMovements = () => <ScrollView contentContainerStyle={styles.page}>
    <Header subtitle="Todos tus ingresos y gastos" />
    <View style={styles.rowBetween}><Text style={styles.sectionTitle}>Movimientos</Text><Button title="+ Nuevo" onPress={() => setModalVisible(true)} small /></View>
    <View style={styles.filterRow}>{['Todos', 'Ingresos', 'Gastos'].map(f => <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}><Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text></TouchableOpacity>)}</View>
    <Card style={{ paddingHorizontal: 14 }}>
      {filteredTransactions.length ? filteredTransactions.map(item => <TransactionRow key={item.id} item={item} rate={rate} onDelete={deleteTransaction} />) :
        <Empty title="Sin movimientos" subtitle="Aquí aparecerán los movimientos que registres." />}
    </Card>
    <Text style={styles.helperText}>Los movimientos se guardan únicamente en este dispositivo.</Text>
  </ScrollView>;

  const renderBudget = () => <ScrollView contentContainerStyle={styles.page}>
    <Header subtitle="Organiza tus metas y tu dinero" />
    <Card style={styles.goalCard}>
      <Text style={styles.goalEyebrow}>META DE AHORRO</Text><Text style={styles.goalAmount}>{money(data.savings)}</Text>
      <Text style={styles.goalSub}>de {money(data.savingsGoal)}</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      <View style={styles.rowBetween}><Text style={styles.goalPercent}>{Math.round(progress * 100)}% completado</Text><Text style={styles.goalPercent}>{money(Math.max(0, Number(data.savingsGoal) - Number(data.savings)))} restantes</Text></View>
    </Card>
    <SectionTitle>Sumar a mi ahorro</SectionTitle>
    <Card><Text style={styles.muted}>Saldo disponible: <Text style={styles.bold}>{money(totals.balance)}</Text></Text>
      <Field label="Cantidad en MXN" value={savingInput} onChangeText={setSavingInput} placeholder="Ej. 200" keyboardType="decimal-pad" />
      <Button title="Guardar ahorro" onPress={addSaving} /></Card>
    <SectionTitle>Presupuesto de comida</SectionTitle>
    <Card><Text style={styles.muted}>Cantidad disponible para preparar comidas económicas.</Text>
      <Field label="Presupuesto en MXN" value={foodInput} onChangeText={setFoodInput} keyboardType="decimal-pad" placeholder="1500" />
      <Button title="Guardar presupuesto" onPress={saveSettings} variant="secondary" /></Card>
    <View style={styles.rowBetween}>
      <SectionTitle>Mis pagos y deudas</SectionTitle>
      <Button title="+ Agregar" onPress={() => setPaymentModalVisible(true)} small />
    </View>
    <Card style={{ paddingHorizontal: 14 }}>
      {(data.payments || []).length ? (data.payments || []).map(p => {
        const status = paymentStatus(p.dueDate, p.paid);
        const statusColor = p.paid ? COLORS.greenDark : status === 'Vencido' ? COLORS.red : status === 'Vence hoy' ? COLORS.amber : COLORS.muted;
        const converted = p.currency === 'USD' ? Number(p.amount) * rate : Number(p.amount);
        return <View key={p.id} style={styles.paymentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.transactionTitle}>{p.name}</Text>
            <Text style={styles.transactionMeta}>Fecha de pago: {dateLabel(`${p.dueDate}T12:00:00`)}</Text>
            <Text style={[styles.paymentStatus, { color: statusColor }]}>{status}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
            <Text style={styles.transactionAmount}>{money(p.amount, p.currency)}</Text>
            {p.currency === 'USD' ? <Text style={styles.converted}>{money(converted)} MXN</Text> : null}
            {!p.paid ? <TouchableOpacity onPress={() => markPaymentPaid(p)} style={styles.paidButton}><Text style={styles.paidButtonText}>Marcar pagado</Text></TouchableOpacity> : null}
          </View>
          <TouchableOpacity onPress={() => deletePayment(p.id)} style={styles.deleteHit}><Text style={styles.deleteText}>×</Text></TouchableOpacity>
        </View>;
      }) : <Empty title="Sin pagos registrados" subtitle="Agrega servicios, préstamos, tarjetas o cualquier deuda con su fecha límite." />}
    </Card>
    <Text style={styles.helperText}>Al marcar un pago como pagado, se registra automáticamente como gasto para actualizar tu saldo. No se registra dos veces.</Text>
    <SectionTitle>Ajustes de moneda y meta</SectionTitle>
    <Card>
      <Field label="Tipo de cambio (1 USD = MXN)" value={rateInput} onChangeText={setRateInput} keyboardType="decimal-pad" placeholder="17.50" />
      <Field label="Meta de ahorro (MXN)" value={goalInput} onChangeText={setGoalInput} keyboardType="decimal-pad" placeholder="10000" />
      <Button title="Guardar ajustes" onPress={saveSettings} />
      <Text style={styles.helperText}>El tipo de cambio es editable y se aplica a todos tus movimientos en USD. No se actualiza automáticamente por Internet.</Text>
    </Card>
  </ScrollView>;

  const renderRecipes = () => <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Header subtitle="Aprovecha lo que tienes y cuida tu bolsillo" />
    <Card style={styles.recipeBudget}>
      <Text style={styles.recipeBudgetLabel}>PRESUPUESTO DE COMIDA RESTANTE ESTE MES</Text>
      <Text style={styles.recipeBudgetAmount}>{money(remainingFoodBudget)}</Text>
      <Text style={styles.recipeBudgetHint}>Presupuesto: {money(foodBudget)} · Gastos registrados en Comida: {money(foodSpentThisMonth)}</Text>
    </Card>
    <SectionTitle>¿Qué tienes o qué te sobró?</SectionTitle>
    <Card>
      <Text style={styles.muted}>Escribe ingredientes separados por comas. Ejemplo: arroz, pollo, papa, jitomate.</Text>
      <TextInput value={leftoverInput} onChangeText={setLeftoverInput} placeholder="¿Qué hay en tu refri o despensa?" placeholderTextColor="#9AA6AE" style={[styles.input, { marginTop: 10 }]} />
      <Text style={styles.helperText}>Te mostraremos recetas que aprovechen al menos uno de esos ingredientes. Si lo dejas vacío, verás todas.</Text>
    </Card>
    <SectionTitle>Personaliza tu búsqueda</SectionTitle>
    <Card>
      <Text style={styles.fieldLabel}>Buscar receta o ingrediente</Text>
      <TextInput value={recipeSearch} onChangeText={setRecipeSearch} placeholder="Ej. pollo, pasta, quesadillas…" placeholderTextColor="#9AA6AE" style={styles.input} />
      <View style={styles.recipeControls}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>¿Para cuántas personas?</Text>
          <TextInput value={recipeServings} onChangeText={setRecipeServings} keyboardType="number-pad" placeholder="2" placeholderTextColor="#9AA6AE" style={styles.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Máximo por receta (MXN)</Text>
          <TextInput value={recipeLimitInput} onChangeText={setRecipeLimitInput} keyboardType="decimal-pad" placeholder={String(Math.round(remainingFoodBudget))} placeholderTextColor="#9AA6AE" style={styles.input} />
        </View>
      </View>
      <Button title="Usar presupuesto restante" variant="secondary" onPress={() => setRecipeLimitInput(String(Math.round(remainingFoodBudget)))} />
      <TouchableOpacity onPress={() => { setRecipeSearch(''); setLeftoverInput(''); setRecipeLimitInput(''); setRecipeServings('2'); }} style={{ paddingVertical: 10 }}>
        <Text style={styles.link}>Limpiar filtros</Text>
      </TouchableOpacity>
    </Card>
    <SectionTitle>{availableRecipes.length} recetas encontradas</SectionTitle>
    {availableRecipes.length ? availableRecipes.map((r, i) => <TouchableOpacity key={r.name} activeOpacity={0.85} onPress={() => setSelectedRecipe(r)}>
      <Card style={styles.recipeCard}><View style={styles.recipeEmoji}><Text style={{ fontSize: 25 }}>{['🍚','🫘','🍝','🥣','🧀','🥕','🥒','🍲'][i % 8]}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.recipeName}>{r.name}</Text><Text style={styles.recipeMeta}>{r.time} · para {servings} {servings === 1 ? 'persona' : 'personas'}</Text><Text style={styles.recipeCost}>{money(r.displayCost)} aprox.</Text></View><Text style={styles.chevron}>›</Text></Card>
    </TouchableOpacity>) : <Card><Empty title="No encontramos recetas con esos filtros" subtitle="Prueba otro ingrediente, aumenta el presupuesto o limpia los filtros para ver más ideas." /></Card>}
    <Text style={styles.helperText}>Hay {RECIPE_CATALOG.length} recetas en el catálogo. Los costos son estimados y pueden variar por tienda y zona. Los gastos se descuentan del presupuesto cuando registras un movimiento en la categoría Comida.</Text>
  </ScrollView>;

  const tabs = [
    { name: 'Inicio', icon: '⌂' }, { name: 'Movimientos', icon: '↕' },
    { name: 'Presupuesto', icon: '▤' }, { name: 'Recetas', icon: '♨' }
  ];
  if (!loaded) return <SafeAreaView style={styles.loading}><StatusBar barStyle="dark-content" /><Text style={styles.brand}>Peso <Text style={{ color: COLORS.green }}>Claro</Text></Text><Text style={styles.muted}>Preparando tus finanzas…</Text></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
    <View style={styles.content}>
      {tab === 'Inicio' ? renderHome() : tab === 'Movimientos' ? renderMovements() : tab === 'Presupuesto' ? renderBudget() : renderRecipes()}
    </View>
    <View style={styles.tabBar}>{tabs.map(t => <TouchableOpacity key={t.name} onPress={() => setTab(t.name)} style={styles.tabItem}>
      <Text style={[styles.tabIcon, tab === t.name && styles.tabIconActive]}>{t.icon}</Text>
      <Text style={[styles.tabLabel, tab === t.name && styles.tabLabelActive]}>{t.name}</Text>
    </TouchableOpacity>)}</View>

    <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.rowBetween}><Text style={styles.modalTitle}>Nuevo movimiento</Text><TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <View style={styles.segmentRow}>
            <TouchableOpacity onPress={() => setType('income')} style={[styles.segment, type === 'income' && styles.segmentActive]}><Text style={[styles.segmentText, type === 'income' && styles.segmentTextActive]}>Ingreso</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setType('expense')} style={[styles.segment, type === 'expense' && styles.segmentActive]}><Text style={[styles.segmentText, type === 'expense' && styles.segmentTextActive]}>Gasto</Text></TouchableOpacity>
          </View>
          <Field label="Concepto" value={concept} onChangeText={setConcept} placeholder="Ej. Despensa, sueldo…" />
          <Text style={styles.fieldLabel}>Categoría</Text>
          <View style={styles.categoryWrap}>{CATEGORIES.map(c => <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.categoryChip, category === c && styles.categoryChipActive]}><Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>{c}</Text></TouchableOpacity>)}</View>
          <Field label="Monto" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
          <Text style={styles.fieldLabel}>Moneda</Text>
          <View style={styles.segmentRow}>
            {['MXN', 'USD'].map(c => <TouchableOpacity key={c} onPress={() => setCurrency(c)} style={[styles.segment, currency === c && styles.segmentActive]}><Text style={[styles.segmentText, currency === c && styles.segmentTextActive]}>{c}</Text></TouchableOpacity>)}
          </View>
          <Text style={styles.dateNote}>Fecha automática: {new Date().toLocaleDateString('es-MX')}</Text>
          {currency === 'USD' && <Text style={styles.helperText}>Equivalente aproximado: {money((Number(amount.replace(',', '.')) || 0) * rate)}</Text>}
          <Button title="Guardar movimiento" onPress={addTransaction} style={{ marginTop: 12 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={paymentModalVisible} animationType="slide" transparent onRequestClose={() => setPaymentModalVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.rowBetween}><Text style={styles.modalTitle}>Nuevo pago o deuda</Text><TouchableOpacity onPress={() => setPaymentModalVisible(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <Field label="Nombre del pago o deuda" value={paymentName} onChangeText={setPaymentName} placeholder="Ej. Renta, tarjeta, luz…" />
          <Field label="Monto" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="0.00" keyboardType="decimal-pad" />
          <Text style={styles.fieldLabel}>Moneda</Text>
          <View style={styles.segmentRow}>
            {['MXN', 'USD'].map(c => <TouchableOpacity key={c} onPress={() => setPaymentCurrency(c)} style={[styles.segment, paymentCurrency === c && styles.segmentActive]}><Text style={[styles.segmentText, paymentCurrency === c && styles.segmentTextActive]}>{c}</Text></TouchableOpacity>)}
          </View>
          <Field label="Fecha límite de pago (AAAA-MM-DD)" value={paymentDate} onChangeText={setPaymentDate} placeholder="2026-11-15" />
          <Text style={styles.helperText}>Escribe la fecha en formato año-mes-día. Ejemplo: 2026-11-15.</Text>
          <Button title="Guardar pago o deuda" onPress={addPayment} style={{ marginTop: 14 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={!!selectedRecipe} transparent animationType="fade" onRequestClose={() => setSelectedRecipe(null)}>
      <View style={styles.modalBackdrop}><View style={styles.recipeModal}>
        <TouchableOpacity style={styles.recipeClose} onPress={() => setSelectedRecipe(null)}><Text style={styles.closeText}>×</Text></TouchableOpacity>
        {selectedRecipe && <>
          <Text style={styles.recipeModalTitle}>{selectedRecipe.name}</Text>
          <Text style={styles.recipeCost}>{money(selectedRecipe.displayCost || selectedRecipe.cost)} aprox. · {selectedRecipe.time}</Text>
          <Text style={styles.recipeDetailHeading}>Ingredientes sugeridos</Text><Text style={styles.recipeDetail}>{selectedRecipe.ingredients.join(', ')}</Text>
          <Text style={styles.recipeDetailHeading}>Porciones</Text><Text style={styles.recipeDetail}>{servings} {servings === 1 ? 'persona' : 'personas'}. Ajusta las cantidades al cocinar.</Text>
          <Text style={styles.recipeDetailHeading}>Preparación</Text><Text style={styles.recipeDetail}>{selectedRecipe.steps}</Text>
          <Button title="Cerrar" onPress={() => setSelectedRecipe(null)} style={{ marginTop: 20 }} />
        </>}
      </View></View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg }, content: { flex: 1 },
  page: { padding: 18, paddingBottom: 28 }, topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brand: { fontSize: 25, fontWeight: '900', color: COLORS.navy, letterSpacing: -0.8 },
  headerSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.greenDark, fontWeight: '900', fontSize: 20 },
  balanceCard: { backgroundColor: COLORS.navy, borderRadius: 22, padding: 21, marginBottom: 14 },
  balanceLabel: { color: '#B9CBD4', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  balanceValue: { color: COLORS.white, fontSize: 33, fontWeight: '900', marginTop: 7 },
  balanceFoot: { color: '#A9BEC9', fontSize: 11, marginTop: 3 },
  balanceLine: { height: 1, backgroundColor: '#38566A', marginVertical: 17 },
  balanceStats: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceStatLabel: { color: '#B9CBD4', fontSize: 11, marginBottom: 5 },
  balanceStatValue: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  summaryGrid: { flexDirection: 'row', gap: 11, marginBottom: 13 },
  card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EEF1F3' },
  summaryCard: { flex: 1, marginBottom: 0, padding: 14 },
  summaryLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  summaryValue: { color: COLORS.text, fontSize: 17, fontWeight: '900', marginTop: 7 },
  summaryHint: { color: '#9AA6AE', fontSize: 10, marginTop: 4 },
  quickActions: { flexDirection: 'row', gap: 10, marginVertical: 17 },
  button: { minHeight: 47, borderRadius: 13, backgroundColor: COLORS.green, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  buttonSecondary: { backgroundColor: COLORS.greenPale }, buttonGhost: { backgroundColor: 'transparent' }, buttonDanger: { backgroundColor: COLORS.redPale },
  buttonSmall: { minHeight: 37, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 11 },
  buttonText: { color: COLORS.white, fontSize: 13, fontWeight: '800' }, buttonTextDark: { color: COLORS.greenDark }, buttonTextSmall: { fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  sectionTitle: { color: COLORS.navy, fontWeight: '900', fontSize: 16 }, link: { color: COLORS.greenDark, fontSize: 12, fontWeight: '800' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F3' },
  transactionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  transactionInfo: { flex: 1, minWidth: 0 }, transactionTitle: { color: COLORS.text, fontWeight: '800', fontSize: 13 },
  transactionMeta: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  transactionRight: { alignItems: 'flex-end', marginLeft: 7 }, transactionAmount: { fontSize: 12, fontWeight: '900' },
  converted: { color: COLORS.muted, fontSize: 9, marginTop: 3 }, deleteHit: { paddingLeft: 10, paddingVertical: 4 },
  deleteText: { color: COLORS.red, fontSize: 22, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12 }, emptyIcon: { color: '#A9B8C0', fontSize: 30 },
  emptyTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '800', marginTop: 8 }, emptyText: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 5, lineHeight: 17 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: COLORS.muted, fontSize: 12 }, bold: { color: COLORS.navy, fontWeight: '900' },
  progressTrack: { height: 9, backgroundColor: '#E4ECE7', borderRadius: 9, overflow: 'hidden', marginTop: 13, marginBottom: 7 },
  progressFill: { height: 9, backgroundColor: COLORS.green, borderRadius: 9 },
  smallMuted: { color: COLORS.muted, fontSize: 10 }, filterRow: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy }, filterText: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: COLORS.white }, helperText: { color: COLORS.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  goalCard: { backgroundColor: COLORS.navy, padding: 21 }, goalEyebrow: { color: '#B9CBD4', fontSize: 10, letterSpacing: 1.3, fontWeight: '800' },
  goalAmount: { color: COLORS.white, fontSize: 31, fontWeight: '900', marginTop: 9 }, goalSub: { color: '#B9CBD4', fontSize: 12 },
  goalPercent: { color: '#D5E3E8', fontSize: 10, fontWeight: '700' },
  fieldWrap: { marginTop: 13, marginBottom: 4 }, fieldLabel: { color: COLORS.navy, fontWeight: '800', fontSize: 11, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FBFCFC', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: COLORS.text, fontSize: 14 },
  recipeBudget: { backgroundColor: COLORS.greenPale, borderColor: '#D9EDE0' }, recipeBudgetLabel: { color: COLORS.greenDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  recipeBudgetAmount: { color: COLORS.navy, fontSize: 29, fontWeight: '900', marginTop: 8 }, recipeBudgetHint: { color: '#567565', fontSize: 11, marginTop: 4 },
  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  recipeControls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  recipeEmoji: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#F1F5F2', alignItems: 'center', justifyContent: 'center' },
  recipeName: { color: COLORS.navy, fontSize: 13, fontWeight: '900' }, recipeMeta: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  recipeCost: { color: COLORS.greenDark, fontWeight: '900', fontSize: 14, marginTop: 5 }, chevron: { color: '#9BAAB2', fontSize: 25 },
  tabBar: { height: 68, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 7 : 2 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }, tabIcon: { fontSize: 20, color: '#9AA7AF', fontWeight: '700' },
  tabIconActive: { color: COLORS.green }, tabLabel: { fontSize: 9, color: COLORS.muted, fontWeight: '600' }, tabLabelActive: { color: COLORS.greenDark, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(9,25,36,0.48)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: '92%' },
  modalHandle: { width: 40, height: 4, borderRadius: 4, backgroundColor: '#D9E0E4', alignSelf: 'center', marginBottom: 17 },
  modalTitle: { color: COLORS.navy, fontSize: 20, fontWeight: '900' }, closeText: { color: COLORS.muted, fontSize: 28, lineHeight: 30 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 5 },
  segment: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.bg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  segmentActive: { backgroundColor: COLORS.greenPale, borderColor: COLORS.green }, segmentText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: COLORS.greenDark }, categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 },
  categoryChip: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 11, paddingVertical: 8 },
  categoryChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy }, categoryText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  categoryTextActive: { color: COLORS.white }, dateNote: { color: COLORS.muted, fontSize: 10, marginTop: 12 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F3' },
  paymentStatus: { fontSize: 10, fontWeight: '900', marginTop: 5 },
  paidButton: { backgroundColor: COLORS.greenPale, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, marginTop: 7 },
  paidButtonText: { color: COLORS.greenDark, fontSize: 10, fontWeight: '900' },
  recipeModal: { backgroundColor: COLORS.white, margin: 22, borderRadius: 22, padding: 22 },
  recipeClose: { alignSelf: 'flex-end' }, recipeModalTitle: { color: COLORS.navy, fontSize: 21, fontWeight: '900', marginTop: 4 },
  recipeDetailHeading: { color: COLORS.navy, fontWeight: '900', fontSize: 12, marginTop: 18, marginBottom: 5 },
  recipeDetail: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 8 }
});
