import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, ImageBackground, KeyboardAvoidingView, Modal, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EXTRA_RECIPES from './extraRecipes';

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
  savings: 0, foodBudget: '1500', payments: [],
  savingGoals: [{ id: 'legacy-main', name: 'Mi primera meta', target: 10000, saved: 0 }]
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

const BASE_RECIPE_CATALOG = [
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

const RECIPE_CATALOG = [...BASE_RECIPE_CATALOG, ...EXTRA_RECIPES];

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [tab, setTab] = useState('Inicio');
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState('expense');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('Comida');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [filter, setFilter] = useState('Todos');
  const [savingInput, setSavingInput] = useState('');
  const [savingConcept, setSavingConcept] = useState('');
  const [editingSavingId, setEditingSavingId] = useState(null);
  const [selectedSavingGoalId, setSelectedSavingGoalId] = useState('legacy-main');
  const [savingGoalModal, setSavingGoalModal] = useState(false);
  const [savingGoalName, setSavingGoalName] = useState('');
  const [savingGoalTarget, setSavingGoalTarget] = useState('');
  const [editingSavingGoalId, setEditingSavingGoalId] = useState(null);
  const [rateInput, setRateInput] = useState('17.50');
  const [goalInput, setGoalInput] = useState('10000');
  const [foodInput, setFoodInput] = useState('1500');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [leftoverInput, setLeftoverInput] = useState('');
  const [recipeLimitInput, setRecipeLimitInput] = useState('');
  const [recipeServings, setRecipeServings] = useState('2');
  const [onlineRecipes, setOnlineRecipes] = useState([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          const parsed = { ...DEFAULT_DATA, ...stored };
          if (!Array.isArray(stored.savingGoals) || !stored.savingGoals.length) {
            parsed.savingGoals = [{ id: 'legacy-main', name: 'Meta de ahorro', target: Number(parsed.savingsGoal) || 10000, saved: Number(parsed.savings) || 0 }];
            parsed.savingsEntries = (parsed.savingsEntries || []).map(item => ({ ...item, goalId: item.goalId || 'legacy-main' }));
          } else {
            parsed.savingsEntries = (parsed.savingsEntries || []).map(item => ({ ...item, goalId: item.goalId || parsed.savingGoals[0].id }));
          }
          setData(parsed);
          setSelectedSavingGoalId(parsed.savingGoals[0]?.id || 'legacy-main');
          setRateInput(String(parsed.exchangeRate));
          setGoalInput(String(parsed.savingsGoal));
          setFoodInput(String(parsed.foodBudget));
        } else {
          const fresh = { ...DEFAULT_DATA, savingGoals: [{ id: 'legacy-main', name: 'Mi primera meta', target: 10000, saved: 0 }] };
          setData(fresh);
          setSelectedSavingGoalId('legacy-main');
        }
      } catch (e) { Alert.alert('Aviso', 'No se pudieron cargar los datos guardados.'); }
      finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !showWelcome) return;
    const timer = setTimeout(() => setShowWelcome(false), 2000);
    return () => clearTimeout(timer);
  }, [loaded, showWelcome]);

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
    if (!savingConcept.trim()) return Alert.alert('Falta el concepto', 'Escribe para qué es este ahorro.');
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('Monto no válido', 'Escribe una cantidad mayor que cero.');
    const goalId = editingSavingId
      ? ((data.savingsEntries || []).find(item => item.id === editingSavingId)?.goalId || selectedSavingGoalId)
      : selectedSavingGoalId;
    const goal = (data.savingGoals || []).find(item => item.id === goalId);
    if (!goal) return Alert.alert('Selecciona una meta', 'Elige a qué meta quieres agregar este ahorro.');
    if (editingSavingId) {
      const previous = (data.savingsEntries || []).find(item => item.id === editingSavingId);
      if (!previous) return;
      const difference = value - Number(previous.amount || 0);
      if (difference > totals.balance) return Alert.alert('Saldo insuficiente', 'No hay saldo disponible para aumentar ese ahorro.');
      setData(prev => ({
        ...prev,
        savings: Math.max(0, Number(prev.savings || 0) + difference),
        savingGoals: (prev.savingGoals || []).map(item => item.id === goalId ? { ...item, saved: Math.max(0, Number(item.saved || 0) + difference) } : item),
        savingsEntries: (prev.savingsEntries || []).map(item => item.id === editingSavingId ? { ...item, concept: savingConcept.trim(), amount: value } : item)
      }));
      Alert.alert('Ahorro actualizado', 'Se guardaron los cambios.');
    } else {
      if (value > totals.balance) return Alert.alert('Saldo insuficiente', 'El ahorro no puede superar tu saldo disponible.');
      const item = { id: String(Date.now()), concept: savingConcept.trim(), amount: value, date: todayISO(), goalId };
      setData(prev => ({
        ...prev,
        savings: Number(prev.savings || 0) + value,
        savingGoals: (prev.savingGoals || []).map(g => g.id === goalId ? { ...g, saved: Number(g.saved || 0) + value } : g),
        savingsEntries: [item, ...(prev.savingsEntries || [])]
      }));
      Alert.alert('¡Ahorro agregado!', `Se sumaron ${money(value)} a "${goal.name}".`);
    }
    setSavingInput(''); setSavingConcept(''); setEditingSavingId(null);
  };
  const editSaving = (item) => {
    setEditingSavingId(item.id); setSavingConcept(item.concept); setSavingInput(String(item.amount));
    if (item.goalId) setSelectedSavingGoalId(item.goalId);
  };
  const deleteSaving = (item) => Alert.alert('Eliminar ahorro', `¿Quieres eliminar "${item.concept}" y restar ${money(item.amount)} del total ahorrado?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => setData(prev => ({
      ...prev,
      savings: Math.max(0, Number(prev.savings || 0) - Number(item.amount || 0)),
      savingGoals: (prev.savingGoals || []).map(g => g.id === (item.goalId || 'legacy-main') ? { ...g, saved: Math.max(0, Number(g.saved || 0) - Number(item.amount || 0)) } : g),
      savingsEntries: (prev.savingsEntries || []).filter(entry => entry.id !== item.id)
    })) }
  ]);
  const openSavingGoal = (goal) => {
    setEditingSavingGoalId(goal?.id || null);
    setSavingGoalName(goal?.name || '');
    setSavingGoalTarget(String(goal?.target || ''));
    setSavingGoalModal(true);
  };
  const saveSavingGoal = () => {
    const target = Number(savingGoalTarget.replace(',', '.'));
    if (!savingGoalName.trim()) return Alert.alert('Falta el nombre', 'Escribe un nombre para tu meta.');
    if (!Number.isFinite(target) || target <= 0) return Alert.alert('Cantidad no válida', 'El objetivo debe ser mayor que cero.');
    if (editingSavingGoalId) {
      setData(prev => ({ ...prev, savingGoals: (prev.savingGoals || []).map(g => g.id === editingSavingGoalId ? { ...g, name: savingGoalName.trim(), target } : g) }));
    } else {
      const goal = { id: `goal-${Date.now()}`, name: savingGoalName.trim(), target, saved: 0 };
      setData(prev => ({ ...prev, savingGoals: [...(prev.savingGoals || []), goal] }));
      setSelectedSavingGoalId(goal.id);
    }
    setSavingGoalModal(false); setSavingGoalName(''); setSavingGoalTarget(''); setEditingSavingGoalId(null);
  };
  const deleteSavingGoal = (goal) => {
    if ((data.savingGoals || []).length <= 1) return Alert.alert('Necesitas una meta', 'Conserva al menos una meta de ahorro.');
    const destination = data.savingGoals.find(g => g.id !== goal.id);
    const hasMoney = Number(goal.saved || 0) > 0;
    Alert.alert('Eliminar meta', hasMoney
      ? `La cantidad ahorrada en "${goal.name}" se moverá a "${destination.name}" para no perder tu dinero. ¿Continuar?`
      : `¿Quieres eliminar la meta "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        setData(prev => ({
          ...prev,
          savingGoals: prev.savingGoals.filter(g => g.id !== goal.id).map(g => g.id === destination.id
            ? { ...g, saved: Number(g.saved || 0) + Number(goal.saved || 0) } : g),
          savingsEntries: (prev.savingsEntries || []).map(item => item.goalId === goal.id ? { ...item, goalId: destination.id } : item)
        }));
        if (selectedSavingGoalId === goal.id) setSelectedSavingGoalId(destination.id);
      } }
    ]);
  };
  const saveSettings = () => {
    const r = Number(rateInput.replace(',', '.'));
    const f = Number(foodInput.replace(',', '.'));
    if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(f) || f < 0)
      return Alert.alert('Revisa los valores', 'El tipo de cambio debe ser mayor que cero y el presupuesto de comida no puede ser negativo.');
    setData(prev => ({ ...prev, exchangeRate: String(r), foodBudget: String(f) }));
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

  const searchOnlineRecipes = async () => {
    const rawIngredients = leftoverInput.split(',').map(x => x.trim()).filter(Boolean);
    const nameQuery = recipeSearch.trim();
    if (!rawIngredients.length && !nameQuery) {
      setRecipeError('Escribe al menos un ingrediente o el nombre de una receta.');
      setOnlineRecipes([]);
      return;
    }
    const ingredientNames = {
      jitomate: 'tomato', tomate: 'tomato', cebolla: 'onion', ajo: 'garlic',
      papa: 'potato', patata: 'potato', pollo: 'chicken', huevo: 'egg',
      huevos: 'egg', arroz: 'rice', zanahoria: 'carrot', queso: 'cheese',
      leche: 'milk', pasta: 'pasta', fideo: 'vermicelli', frijoles: 'kidney beans',
      frijol: 'kidney beans', atun: 'tuna', atún: 'tuna', pescado: 'fish',
      carne: 'beef', res: 'beef', cerdo: 'pork', puerco: 'pork',
      jamon: 'ham', jamón: 'ham', salchicha: 'sausage', chorizo: 'chorizo',
      elote: 'sweetcorn', maiz: 'sweetcorn', maíz: 'sweetcorn',
      calabacita: 'courgette', calabaza: 'pumpkin', pepino: 'cucumber',
      lechuga: 'lettuce', espinaca: 'spinach', brocoli: 'broccoli',
      brócoli: 'broccoli', champiñon: 'mushrooms', champiñones: 'mushrooms',
      aguacate: 'avocado', limon: 'lime', limón: 'lime', platano: 'banana',
      plátano: 'banana', avena: 'oats', pan: 'bread', tortilla: 'tortillas',
      tortillas: 'tortillas'
    };
    const normalize = value => value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
    const ingredients = rawIngredients.map(item => ingredientNames[normalize(item)] || normalize(item).replace(/\\s+/g, '_'));
    setRecipeLoading(true);
    setRecipeError('');
    setOnlineRecipes([]);
    try {
      const base = 'https://www.themealdb.com/api/json/v1/1';
      let candidates = [];
      if (nameQuery) {
        const response = await fetch(base + '/search.php?s=' + encodeURIComponent(nameQuery));
        if (!response.ok) throw new Error('No se pudo conectar con el buscador.');
        const json = await response.json();
        candidates = json.meals || [];
      } else {
        const response = await fetch(base + '/filter.php?i=' + encodeURIComponent(ingredients[0]));
        if (!response.ok) throw new Error('No se pudo consultar el catálogo de recetas.');
        const json = await response.json();
        const summaries = (json.meals || []).slice(0, 12);
        const details = await Promise.all(summaries.map(async meal => {
          const detailResponse = await fetch(base + '/lookup.php?i=' + meal.idMeal);
          if (!detailResponse.ok) return null;
          const detailJson = await detailResponse.json();
          return detailJson.meals && detailJson.meals[0] ? detailJson.meals[0] : null;
        }));
        candidates = details.filter(Boolean);
      }
      const results = candidates.map(meal => {
        const mealIngredients = [];
        const measures = [];
        for (let i = 1; i <= 20; i++) {
          const ingredient = meal['strIngredient' + i];
          const measure = meal['strMeasure' + i];
          if (ingredient && ingredient.trim()) {
            mealIngredients.push(ingredient.trim());
            measures.push(((measure || '').trim() + ' ' + ingredient.trim()).trim());
          }
        }
        const normalizedMealIngredients = mealIngredients.map(normalize);
        const matched = ingredients.filter(term => normalizedMealIngredients.some(item => item.includes(term.replace(/_/g, ' ')) || term.replace(/_/g, ' ').includes(item)));
        return {
          id: meal.idMeal,
          name: meal.strMeal,
          ingredients: measures,
          steps: meal.strInstructions || 'Consulta la preparación en la página original.',
          time: 'Tiempo no indicado',
          cost: null,
          image: meal.strMealThumb,
          source: meal.strSource || 'https://www.themealdb.com',
          matchedCount: matched.length
        };
      }).sort((a, b) => b.matchedCount - a.matchedCount);
      setOnlineRecipes(results);
      if (!results.length) setRecipeError('No encontramos recetas con esa búsqueda. Prueba con otro ingrediente o escribe su nombre en inglés.');
    } catch (error) {
      setRecipeError('No pudimos conectar con las recetas de Internet. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setRecipeLoading(false);
    }
  };

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
  const recipeLimit = recipeLimitInput.trim() === '' ? null : Math.max(0, Number(recipeLimitInput.replace(',', '.')) || 0);
  const servings = Math.max(1, Math.min(5, Number.parseInt(recipeServings, 10) || 2));
  const normalizeRecipeText = value => String(value || '').toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\\s+/g, ' ').trim();
  const quantityForIngredient = (ingredient, count) => {
    const v = normalizeRecipeText(ingredient);
    const qty = (n) => Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
    if (/huevo/.test(v)) return `${qty(count)} pieza(s)`;
    if (/tortilla/.test(v)) return `${qty(count * 2)} pieza(s)`;
    if (/pollo|pescado|camaron|carne|bistec|cerdo|res |suadero|machaca|tocino|chorizo|salchicha|pavo|panza|chuleta|lomo|sardina|atun|surimi|chicharron/.test(v)) return `${qty(count * 125)} g aprox.`;
    if (/arroz/.test(v)) return `${qty(count * 0.25)} taza(s)`;
    if (/pasta|fideo|codito|sopa de letras/.test(v)) return `${qty(count * 75)} g aprox.`;
    if (/papa|camote|chayote|calabacita|berenjena|pimiento|platano/.test(v)) return `${qty(count)} pieza(s)`;
    if (/frijol|lenteja|garbanzo|haba|alubia/.test(v)) return `${qty(count * 0.5)} taza(s) cocidas`;
    if (/queso|requeson|huitlacoche/.test(v)) return `${qty(count * 30)} g aprox.`;
    if (/crema|mayonesa|mostaza|mantequilla/.test(v)) return `${qty(count)} cucharada(s)`;
    if (/leche|caldo|agua/.test(v)) return `${qty(count * 0.5)} taza(s)`;
    if (/masa de maiz|harina|avena|pan molido/.test(v)) return `${qty(count * 0.25)} taza(s)`;
    if (/jitomate|tomatillo|tomate|zanahoria|cebolla|limon|naranja|pepino|elote|coliflor|brocoli|col |apio|jicama|guayaba|pina|rabano/.test(v)) return `${qty(count * 0.5)} taza(s) o pieza(s) al gusto`;
    return 'al gusto';
  };
  const ingredientAliases = {
    jitomate: ['tomate'], tomate: ['jitomate'], papa: ['patata'], patata: ['papa'],
    'carne molida': ['molida de res', 'res molida'], 'molida de res': ['carne molida'],
    'queso panela': ['panela'], panela: ['queso panela'], 'queso oaxaca': ['quesillo'],
    quesillo: ['queso oaxaca'], frijoles: ['frijol'], frijol: ['frijoles'],
    tortillas: ['tortilla'], tortilla: ['tortillas'], calabacitas: ['calabacita'],
    calabacita: ['calabacitas'], elote: ['maiz', 'maiz tierno'], maiz: ['elote'],
    'chile poblano': ['poblano'], poblano: ['chile poblano'], camarones: ['camaron'],
    camaron: ['camarones'], huevo: ['huevos'], huevos: ['huevo']
  };
  const normalizeIngredient = value => normalizeRecipeText(value);
  const ingredientMatches = (recipeIngredient, availableIngredient) => {
    const a = normalizeIngredient(recipeIngredient), b = normalizeIngredient(availableIngredient);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    return (ingredientAliases[a] || []).some(alias => normalizeIngredient(alias) === b) ||
      (ingredientAliases[b] || []).some(alias => normalizeIngredient(alias) === a);
  };
  const leftoverTerms = leftoverInput.split(',').map(x => x.trim()).filter(Boolean);
  const searchTerm = normalizeRecipeText(recipeSearch);
  const rankedRecipes = RECIPE_CATALOG.map(r => {
    const matchedIngredients = r.ingredients.filter(ingredient => leftoverTerms.some(term => ingredientMatches(ingredient, term)));
    const missingIngredients = r.ingredients.filter(ingredient => !leftoverTerms.some(term => ingredientMatches(ingredient, term)));
    const searchMatch = !searchTerm || normalizeRecipeText(r.name).includes(searchTerm) || r.ingredients.some(x => normalizeRecipeText(x).includes(searchTerm));
    return { ...r, matchedIngredients, missingIngredients, matchedCount: matchedIngredients.length, searchMatch };
  }).filter(r => r.searchMatch && (recipeLimit === null || r.cost * servings / 2 <= recipeLimit) && (!leftoverTerms.length || !!searchTerm || r.matchedCount > 0))
    .sort((a, b) => {
      if (!leftoverTerms.length) return a.name.localeCompare(b.name, 'es-MX');
      return b.matchedCount - a.matchedCount || a.missingIngredients.length - b.missingIngredients.length || a.name.localeCompare(b.name, 'es-MX');
    });
  const availableRecipes = rankedRecipes.map(r => ({ ...r, displayCost: Math.round(r.cost * servings / 2), canCookNow: leftoverTerms.length > 0 && r.missingIngredients.length === 0 }));
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
    <SectionTitle>Mis metas de ahorro</SectionTitle>
    <Text style={styles.muted}>Total ahorrado entre todas tus metas: <Text style={styles.bold}>{money(data.savings)}</Text></Text>
    {(data.savingGoals || []).map(goal => {
      const saved = Number(goal.saved || 0), target = Number(goal.target || 0);
      const pct = target > 0 ? Math.min(1, saved / target) : 0;
      return <Card key={goal.id} style={styles.goalCard}>
        <View style={styles.rowBetween}><Text style={styles.goalEyebrow}>{goal.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => openSavingGoal(goal)} style={styles.paidButton}><Text style={styles.paidButtonText}>Editar</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => deleteSavingGoal(goal)} style={styles.deleteHit}><Text style={styles.deleteText}>×</Text></TouchableOpacity>
          </View>
        </View>
        <Text style={styles.goalAmount}>{money(saved)}</Text><Text style={styles.goalSub}>Objetivo: {money(target)}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct * 100}%` }]} /></View>
        <View style={styles.rowBetween}><Text style={styles.goalPercent}>{Math.round(pct * 100)}% completado</Text><Text style={styles.goalPercent}>{money(Math.max(0, target - saved))} restantes</Text></View>
      </Card>;
    })}
    <Button title="+ Crear otra meta" onPress={() => openSavingGoal(null)} variant="secondary" />
    <SectionTitle>Sumar a una meta</SectionTitle>
    <Card><Text style={styles.muted}>Saldo disponible: <Text style={styles.bold}>{money(totals.balance)}</Text></Text>
      <Text style={styles.fieldLabel}>¿A qué meta quieres agregar dinero?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {(data.savingGoals || []).map(g => <TouchableOpacity key={g.id} onPress={() => setSelectedSavingGoalId(g.id)} style={[styles.segment, selectedSavingGoalId === g.id && styles.segmentActive]}><Text style={[styles.segmentText, selectedSavingGoalId === g.id && styles.segmentTextActive]}>{g.name}</Text></TouchableOpacity>)}
      </View>
      <Field label="Nombre o concepto del ahorro" value={savingConcept} onChangeText={setSavingConcept} placeholder="Ej. Emergencias, vacaciones, carro…" />
      <Field label="Cantidad en MXN" value={savingInput} onChangeText={setSavingInput} placeholder="Ej. 200" keyboardType="decimal-pad" />
      <Button title={editingSavingId ? "Guardar cambios" : "Agregar a mi ahorro"} onPress={addSaving} />
      {editingSavingId ? <Button title="Cancelar edición" variant="ghost" onPress={() => { setEditingSavingId(null); setSavingConcept(''); setSavingInput(''); }} /> : null}
    </Card>
    <SectionTitle>Mis ahorros</SectionTitle>
    <Card style={{ paddingHorizontal: 14 }}>
      {(data.savingsEntries || []).length ? (data.savingsEntries || []).map(item => <View key={item.id} style={styles.paymentRow}>
        <View style={{ flex: 1 }}><Text style={styles.transactionTitle}>{item.concept}</Text><Text style={styles.transactionMeta}>{dateLabel(item.date)}</Text></View>
        <Text style={styles.transactionAmount}>{money(item.amount)}</Text>
        <TouchableOpacity onPress={() => editSaving(item)} style={styles.paidButton}><Text style={styles.paidButtonText}>Editar</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => deleteSaving(item)} style={styles.deleteHit}><Text style={styles.deleteText}>×</Text></TouchableOpacity>
      </View>) : <Empty title="Aún no tienes ahorros individuales" subtitle="Agrega uno con nombre y cantidad para llevar el control." />}
    </Card>
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
    <SectionTitle>Ajustes de moneda</SectionTitle>
    <Card>
      <Field label="Tipo de cambio (1 USD = MXN)" value={rateInput} onChangeText={setRateInput} keyboardType="decimal-pad" placeholder="17.50" />
      <Button title="Guardar ajustes" onPress={saveSettings} />
      <Text style={styles.helperText}>El tipo de cambio es editable y se aplica a todos tus movimientos en USD. No se actualiza automáticamente por Internet. Tus metas se administran arriba, en Mis metas de ahorro.</Text>
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
      <Text style={styles.helperText}>Las opciones se ordenan según cuántos de estos ingredientes ya tienes. También te indicaremos qué te falta para completar cada platillo.</Text>
      {recipeError ? <Text style={[styles.helperText, { color: COLORS.red, marginTop: 9 }]}>{recipeError}</Text> : null}
    </Card>
    <SectionTitle>Personaliza tu búsqueda</SectionTitle>
    <Card>
      <Text style={styles.fieldLabel}>Buscar receta o ingrediente</Text>
      <TextInput value={recipeSearch} onChangeText={setRecipeSearch} placeholder="Ej. chiles rellenos, pollo, quesadillas…" placeholderTextColor="#9AA6AE" style={styles.input} />
      <View style={styles.recipeControls}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>¿Para cuántas personas?</Text>
          <View style={styles.segmentRow}>
            {[1, 2, 3, 4, 5].map(n => <TouchableOpacity key={n} onPress={() => setRecipeServings(String(n))} style={[styles.segment, servings === n && styles.segmentActive]}><Text style={[styles.segmentText, servings === n && styles.segmentTextActive]}>{n} {n === 1 ? 'persona' : 'personas'}</Text></TouchableOpacity>)}
          </View>
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
    <SectionTitle>{availableRecipes.length} recetas del catálogo</SectionTitle>
    {availableRecipes.length ? availableRecipes.map((r, i) => <TouchableOpacity key={r.name} activeOpacity={0.85} onPress={() => setSelectedRecipe(r)}>
      <Card style={styles.recipeCard}><View style={styles.recipeEmoji}><Text style={{ fontSize: 25 }}>{['🍚','🫘','🍝','🥣','🧀','🥕','🥒','🍲'][i % 8]}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.recipeName}>{r.name}</Text><Text style={styles.recipeMeta}>{r.time} · para {servings} {servings === 1 ? 'persona' : 'personas'}</Text><Text style={styles.recipeCost}>{money(r.displayCost)} aprox.</Text><Text style={[styles.helperText, { color: r.canCookNow ? COLORS.greenDark : COLORS.amber }]}>{leftoverTerms.length ? (r.canCookNow ? '✓ La puedes preparar con lo que tienes' : 'Te faltan: ' + r.missingIngredients.join(', ')) : 'Agrega lo que tienes en tu refrigerador para comparar ingredientes'}</Text></View><Text style={styles.chevron}>›</Text></Card>
    </TouchableOpacity>) : <Card><Empty title="No encontramos recetas con esos filtros" subtitle="Prueba otro ingrediente, aumenta el presupuesto o limpia los filtros para ver más ideas." /></Card>}
    <Text style={styles.helperText}>Hay {RECIPE_CATALOG.length} recetas en el catálogo. Los costos son estimados y pueden variar por tienda y zona. Los gastos se descuentan del presupuesto cuando registras un movimiento en la categoría Comida.</Text>
  </ScrollView>;

  const tabs = [
    { name: 'Inicio', icon: '⌂' }, { name: 'Movimientos', icon: '↕' },
    { name: 'Presupuesto', icon: '▤' }, { name: 'Recetas', icon: '♨' }
  ];
  if (!loaded) return <SafeAreaView style={styles.loading}><StatusBar barStyle="dark-content" /><Text style={styles.brand}>Peso <Text style={{ color: COLORS.green }}>Claro</Text></Text><Text style={styles.muted}>Preparando tus finanzas…</Text></SafeAreaView>;

  if (showWelcome) return <SafeAreaView style={{ flex: 1, backgroundColor: '#07140F' }}>
    <StatusBar barStyle="light-content" backgroundColor="#07140F" />
    <ImageBackground source={require('./peso-claro-portada.png')} resizeMode="contain" style={{ flex: 1 }} />
  </SafeAreaView>;

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

    <Modal visible={savingGoalModal} transparent animationType="fade" onRequestClose={() => setSavingGoalModal(false)}>
      <View style={styles.modalBackdrop}><View style={styles.recipeModal}>
        <Text style={styles.recipeModalTitle}>{editingSavingGoalId ? 'Editar meta' : 'Nueva meta de ahorro'}</Text>
        <Field label="Nombre de la meta" value={savingGoalName} onChangeText={setSavingGoalName} placeholder="Ej. Viaje, emergencias, auto" />
        <Field label="Cantidad objetivo en MXN" value={savingGoalTarget} onChangeText={setSavingGoalTarget} keyboardType="decimal-pad" placeholder="Ej. 15000" />
        <Button title="Guardar meta" onPress={saveSavingGoal} style={{ marginTop: 14 }} />
        <Button title="Cancelar" variant="ghost" onPress={() => setSavingGoalModal(false)} />
      </View></View>
    </Modal>

    <Modal visible={!!selectedRecipe} transparent animationType="fade" onRequestClose={() => setSelectedRecipe(null)}>
      <View style={styles.modalBackdrop}><View style={styles.recipeModal}>
        <TouchableOpacity style={styles.recipeClose} onPress={() => setSelectedRecipe(null)}><Text style={styles.closeText}>×</Text></TouchableOpacity>
        {selectedRecipe && <>
          <Text style={styles.recipeModalTitle}>{selectedRecipe.name}</Text>
          {selectedRecipe.cost == null ? <Text style={styles.recipeMeta}>{selectedRecipe.time} · Costo no disponible</Text> : <Text style={styles.recipeCost}>{money(selectedRecipe.displayCost || selectedRecipe.cost)} aprox. · {selectedRecipe.time}</Text>}
          <Text style={styles.recipeDetailHeading}>Ingredientes aproximados para {servings} {servings === 1 ? 'persona' : 'personas'}</Text><Text style={styles.recipeDetail}>{selectedRecipe.ingredients.map(ingredient => `• ${quantityForIngredient(ingredient, servings)} de ${ingredient}`).join('\n')}</Text>
          {selectedRecipe.missingIngredients && selectedRecipe.missingIngredients.length ? <><Text style={styles.recipeDetailHeading}>Te hace falta comprar</Text><Text style={styles.recipeDetail}>{selectedRecipe.missingIngredients.join(', ')}</Text></> : <Text style={[styles.helperText, { color: COLORS.greenDark }]}>¡Tienes todo para preparar esta receta!</Text>}
          <Text style={styles.helperText}>Las cantidades son orientativas y se ajustan al número de personas; ajusta sal, aceite y condimentos al gusto.</Text>
          <Text style={styles.recipeDetailHeading}>Preparación</Text><Text style={styles.recipeDetail}>{selectedRecipe.steps}</Text>
          {selectedRecipe.source ? <Text style={styles.helperText}>Receta consultada en TheMealDB. Algunas recetas pueden aparecer en inglés.</Text> : null}
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
