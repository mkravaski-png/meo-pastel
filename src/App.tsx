import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus,
  Trash2, 
  ShoppingBasket, 
  ChevronRight, 
  Info, 
  CheckCircle2,
  UtensilsCrossed,
  X,
  ExternalLink,
  Smartphone,
  Sparkles,
  Loader2,
  Wand2
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type Filling = {
  id: string;
  name: string;
  price: number;
  category: 'Básico' | 'Especial' | 'Premium';
  type: 'salgado' | 'doce';
};

type Beverage = {
  id: string;
  name: string;
  price: number;
  category: 'Refrigerante' | 'Suco' | 'Caldo de Cana';
};

type CartItem = {
  id: string;
  type: 'pastel' | 'beverage';
  subType?: 'salgado' | 'doce';
  name: string;
  details?: string;
  price: number;
  quantity: number;
};

type ConsumptionMethod = 'imediato' | 'viagem' | 'entrega';

type DeliveryInfo = {
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  complement: string;
  observations: string;
  distance?: number;
  fee?: number;
  error?: string;
};

type SubOrder = {
  id: string;
  label: string;
  cart: CartItem[];
  consumptionMethod: ConsumptionMethod;
  deliveryInfo: DeliveryInfo;
  total: number;
};

type PaymentMethod = 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro';

type OrderStatus = 'pending' | 'paid' | 'failed';

type Suggestion = {
  title: string;
  fillings: string[];
  description: string;
};

// --- Data ---

const COMPANY_ADDRESS = "Rua Marino Félix, 280 - Casa Verde - São Paulo - CEP 02515-030";

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'Pix', label: 'Pix' },
  { id: 'Cartão de Crédito', label: 'Cartão de Crédito' },
  { id: 'Cartão de Débito', label: 'Cartão de Débito' },
  { id: 'Dinheiro', label: 'Dinheiro' },
];

const FILLINGS: Filling[] = [
  // Salgados - Básico
  { id: 'queijo', name: 'Queijo Muçarela', price: 12, category: 'Básico', type: 'salgado' },
  { id: 'presunto', name: 'Presunto', price: 12, category: 'Básico', type: 'salgado' },
  { id: 'milho', name: 'Milho Verde', price: 12, category: 'Básico', type: 'salgado' },
  { id: 'ovo', name: 'Ovo Cozido', price: 12, category: 'Básico', type: 'salgado' },
  { id: 'tomate', name: 'Tomate', price: 12, category: 'Básico', type: 'salgado' },
  { id: 'azeitona', name: 'Azeitona', price: 12, category: 'Básico', type: 'salgado' },
  
  // Salgados - Especial
  { id: 'carne', name: 'Carne Moída', price: 16, category: 'Especial', type: 'salgado' },
  { id: 'frango', name: 'Frango Desfiado', price: 16, category: 'Especial', type: 'salgado' },
  { id: 'calabresa', name: 'Calabresa', price: 16, category: 'Especial', type: 'salgado' },
  { id: 'palmito', name: 'Palmito', price: 16, category: 'Especial', type: 'salgado' },
  { id: 'catupiry', name: 'Catupiry Original', price: 16, category: 'Especial', type: 'salgado' },
  
  // Salgados - Premium
  { id: 'camarao', name: 'Camarão', price: 22, category: 'Premium', type: 'salgado' },
  { id: 'carne-seca', name: 'Carne Seca', price: 22, category: 'Premium', type: 'salgado' },
  { id: 'bacalhau', name: 'Bacalhau', price: 22, category: 'Premium', type: 'salgado' },
  { id: 'quatro-queijos', name: 'Quatro Queijos', price: 22, category: 'Premium', type: 'salgado' },
  { id: 'pepperoni', name: 'Pepperoni', price: 22, category: 'Premium', type: 'salgado' },

  // Doces - Básico
  { id: 'banana', name: 'Banana', price: 12, category: 'Básico', type: 'doce' },
  { id: 'doce-leite', name: 'Doce de Leite', price: 12, category: 'Básico', type: 'doce' },
  { id: 'goiabada', name: 'Goiabada', price: 12, category: 'Básico', type: 'doce' },
  { id: 'coco', name: 'Coco Ralado', price: 12, category: 'Básico', type: 'doce' },

  // Doces - Especial
  { id: 'chocolate', name: 'Chocolate ao Leite', price: 16, category: 'Especial', type: 'doce' },
  { id: 'morango', name: 'Morango Fresco', price: 16, category: 'Especial', type: 'doce' },
  { id: 'leite-ninho', name: 'Leite Ninho', price: 16, category: 'Especial', type: 'doce' },

  // Doces - Premium
  { id: 'nutella', name: 'Nutella Original', price: 22, category: 'Premium', type: 'doce' },
  { id: 'chocolate-branco', name: 'Chocolate Branco', price: 22, category: 'Premium', type: 'doce' },
];

const BEVERAGES: Beverage[] = [
  { id: 'coca-cola', name: 'Coca-Cola 350ml', price: 6, category: 'Refrigerante' },
  { id: 'guarana', name: 'Guaraná 350ml', price: 5, category: 'Refrigerante' },
  { id: 'suco-laranja', name: 'Suco de Laranja 400ml', price: 8, category: 'Suco' },
  { id: 'suco-uva', name: 'Suco de Uva 400ml', price: 8, category: 'Suco' },
  { id: 'caldo-cana-p', name: 'Caldo de Cana 300ml', price: 7, category: 'Caldo de Cana' },
  { id: 'caldo-cana-m', name: 'Caldo de Cana 500ml', price: 10, category: 'Caldo de Cana' },
  { id: 'caldo-cana-g', name: 'Caldo de Cana 700ml', price: 13, category: 'Caldo de Cana' },
];

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'salgados' | 'doces' | 'bebidas'>('salgados');
  const [selectedFillings, setSelectedFillings] = useState<Filling[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
  const [orderLabel, setOrderLabel] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const COMPANY_WHATSAPP = "5511954261780";

  const generateAISuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const isSweet = activeTab === 'doces';
      const currentFillings = FILLINGS.filter(f => f.type === (isSweet ? 'doce' : 'salgado'));
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um especialista em pastéis gourmet. Com base EXCLUSIVAMENTE nesta lista de recheios ${isSweet ? 'DOCES' : 'SALGADOS'}: ${currentFillings.map(f => f.name).join(', ')}, sugira 3 combinações irresistíveis. 
        
        REGRAS OBRIGATÓRIAS:
        1. Use APENAS os nomes exatos dos recheios da lista fornecida acima.
        2. Cada sugestão deve conter EXATAMENTE 3 recheios diferentes.
        3. NÃO invente ingredientes novos.
        4. NÃO misture salgado com doce.
        5. Crie um título curto e apetitoso para a combinação.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Um nome criativo para a combinação" },
                fillings: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Lista de exatamente 3 nomes de recheios da lista fornecida"
                },
                description: { type: Type.STRING, description: "Por que essa combinação é boa?" }
              },
              required: ["title", "fillings", "description"]
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Erro ao gerar sugestões:", error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    const isSweet = activeTab === 'doces';
    const currentFillings = FILLINGS.filter(f => f.type === (isSweet ? 'doce' : 'salgado'));
    
    const matchedFillings = suggestion.fillings.map(name => 
      currentFillings.find(f => f.name.toLowerCase().trim() === name.toLowerCase().trim())
    ).filter((f): f is Filling => !!f);

    if (matchedFillings.length > 0) {
      setSelectedFillings(matchedFillings.slice(0, 3));
      // Scroll to the "Monte seu Pastel" section or bottom
      setTimeout(() => {
        const element = document.getElementById('filling-selection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const [consumptionMethod, setConsumptionMethod] = useState<ConsumptionMethod | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Reset delivery info when consumption method changes
    useEffect(() => {
      if (consumptionMethod !== 'entrega') {
        setDeliveryInfo({ cep: '', address: '', number: '', neighborhood: '', complement: '', observations: '' });
      }
    }, [consumptionMethod]);

  // Validate payment method when consumption method changes to delivery
  useEffect(() => {
    if (consumptionMethod === 'entrega' && paymentMethod && paymentMethod !== 'Pix' && paymentMethod !== 'Cartão de Crédito') {
      setPaymentMethod(null);
    }
  }, [consumptionMethod, paymentMethod]);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    cep: '',
    address: '',
    number: '',
    neighborhood: '',
    complement: '',
    observations: ''
  });

  // Reset delivery fee when address changes
  useEffect(() => {
    if (deliveryInfo.fee !== undefined || deliveryInfo.distance !== undefined || deliveryInfo.error) {
      setDeliveryInfo(prev => ({ ...prev, fee: undefined, distance: undefined, error: undefined }));
    }
  }, [deliveryInfo.cep, deliveryInfo.address, deliveryInfo.number, deliveryInfo.neighborhood]);

  const fetchAddressFromCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setDeliveryInfo(prev => ({
          ...prev,
          address: data.logradouro,
          neighborhood: data.bairro,
          error: undefined
        }));
      } else {
        setDeliveryInfo(prev => ({ ...prev, error: "CEP não encontrado." }));
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
      setDeliveryInfo(prev => ({ ...prev, error: "Erro ao buscar CEP." }));
    } finally {
      setIsSearchingCep(false);
    }
  };

  const currentPrice = useMemo(() => {
    if (selectedFillings.length === 0) return 0;
    return Math.max(...selectedFillings.map(f => f.price));
  }, [selectedFillings]);

  const addFilling = (filling: Filling) => {
    if (selectedFillings.length < 3) {
      setSelectedFillings(prev => [...prev, filling]);
    }
  };

  const removeFillingByIndex = (index: number) => {
    setSelectedFillings(prev => prev.filter((_, i) => i !== index));
  };

  const removeFillingById = (id: string) => {
    setSelectedFillings(prev => {
      const lastIndex = [...prev].reverse().findIndex(f => f.id === id);
      if (lastIndex === -1) return prev;
      const actualIndex = prev.length - 1 - lastIndex;
      return prev.filter((_, i) => i !== actualIndex);
    });
  };

  const scrollToMenu = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (menuRef.current) {
      menuRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const addPastelToCart = () => {
    if (selectedFillings.length === 3) {
      const isSweet = selectedFillings[0].type === 'doce';
      const newOrder: CartItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'pastel',
        subType: isSweet ? 'doce' : 'salgado',
        name: isSweet ? 'Pastel Doce Customizado' : 'Pastel Salgado Customizado',
        details: selectedFillings.map(f => f.name).join(', '),
        price: currentPrice,
        quantity: 1
      };
      setCart(prev => [...prev, newOrder]);
      setSelectedFillings([]);
      setActiveTab('salgados');
      setTimeout(scrollToMenu, 200);
      setLastAddedId('cart-icon');
      setTimeout(() => setLastAddedId(null), 500);
    }
  };

  const addBeverageToCart = (beverage: Beverage) => {
    setCart(prev => {
      const existing = prev.find(item => item.type === 'beverage' && item.name === beverage.name);
      if (existing) {
        return prev.map(item => 
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'beverage',
        name: beverage.name,
        price: beverage.price,
        quantity: 1
      }];
    });
    setLastAddedId(beverage.id);
    setActiveTab('salgados');
    setTimeout(scrollToMenu, 200);
    setTimeout(() => setLastAddedId(null), 500);
  };

  const removeBeverageFromCart = (beverageName: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.type === 'beverage' && item.name === beverageName);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map(item => 
          item.id === existing.id ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.id !== existing.id);
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculateDeliveryFee = async () => {
    if (!deliveryInfo.cep || !deliveryInfo.address || !deliveryInfo.number || !deliveryInfo.neighborhood) {
      setDeliveryInfo(prev => ({ ...prev, error: "Preencha todos os campos obrigatórios (CEP, Endereço, Nº e Bairro)." }));
      return;
    }
    
    setIsCalculatingDistance(true);
    setDeliveryInfo(prev => ({ ...prev, error: undefined }));

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave API não configurada.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const fullAddress = `${deliveryInfo.address}, ${deliveryInfo.number} - ${deliveryInfo.neighborhood}, São Paulo, Brasil, CEP ${deliveryInfo.cep}`;
      
      const prompt = `Calcule a distância em metros (raio/linha reta) entre estes dois locais em São Paulo:
Sede: ${COMPANY_ADDRESS}
Cliente: ${fullAddress}

INSTRUÇÕES:
1. Use a ferramenta Google Maps para localizar os endereços.
2. Determine a distância em linha reta (raio) entre eles.
3. Responda APENAS o número da distância em metros (ex: 1500).
4. Se não encontrar o número exato, use o CEP e a rua para estimar a distância.
5. Não responda com textos explicativos, apenas o número.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
        },
      });

      const text = response.text?.trim() || '';
      
      // Tentar extrair qualquer número da resposta
      const distMatch = text.match(/\d+/g);
      
      if (!distMatch || distMatch.length === 0) {
        // Se falhar, tentar uma mensagem mais genérica mas que não trave o usuário
        setDeliveryInfo(prev => ({ 
          ...prev, 
          error: "Não foi possível calcular a distância exata. Por favor, verifique se o endereço está correto ou tente novamente.", 
          distance: undefined, 
          fee: undefined 
        }));
      } else {
        // Pegar o primeiro número que pareça uma distância razoável (em metros)
        const dist = parseInt(distMatch[0], 10);
        
        if (isNaN(dist) || dist <= 0) {
          throw new Error("Distância inválida.");
        }

        let fee = 0;
        let error = undefined;

        // Faixas de preço solicitadas pelo usuário
        if (dist <= 100) fee = 0;
        else if (dist <= 2500) fee = 7;
        else if (dist <= 5000) fee = 12;
        else if (dist <= 7000) fee = 15;
        else error = `Distância de ${(dist/1000).toFixed(1)}km está fora da nossa área de entrega direta (máx 7km). Por favor, utilize iFood ou Rappi.`;

        setDeliveryInfo(prev => ({ ...prev, distance: dist, fee, error }));
      }
    } catch (err: any) {
      console.error("Erro no cálculo de frete:", err);
      setDeliveryInfo(prev => ({ ...prev, error: "Ocorreu um erro ao processar o frete. Por favor, tente novamente em alguns segundos." }));
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const addSubOrder = () => {
    if (cart.length === 0 || !consumptionMethod) return;
    
    const currentTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0) + (consumptionMethod === 'entrega' ? (deliveryInfo.fee || 0) : 0);
    
    const newSubOrder: SubOrder = {
      id: Math.random().toString(36).substr(2, 9),
      label: orderLabel.trim(),
      cart: [...cart],
      consumptionMethod,
      deliveryInfo: { ...deliveryInfo },
      total: currentTotal
    };
    
    setSubOrders(prev => [...prev, newSubOrder]);
    setCart([]);
    setOrderLabel('');
    setConsumptionMethod(null);
    setDeliveryInfo({ cep: '', address: '', number: '', neighborhood: '', complement: '', observations: '' });
    setIsCheckoutModalOpen(false);
  };

  const removeSubOrder = (id: string) => {
    setSubOrders(prev => prev.filter(order => order.id !== id));
  };

  const totalItems = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const currentOrderTotal = totalItems + (consumptionMethod === 'entrega' ? (deliveryInfo.fee || 0) : 0);
  const subOrdersTotal = subOrders.reduce((acc, order) => acc + order.total, 0);
  const totalCart = currentOrderTotal + subOrdersTotal;

  const isCheckoutDisabled = useMemo(() => {
    // Se temos pedidos anteriores mas o carrinho atual está vazio, podemos finalizar se houver forma de pagamento
    if (subOrders.length > 0 && cart.length === 0) {
      return !paymentMethod;
    }

    if (cart.length === 0) return true;
    if (!customerName.trim()) return true;
    if (!consumptionMethod) return true;
    if (!paymentMethod) return true;
    if (consumptionMethod === 'entrega') {
      if (!deliveryInfo.cep || !deliveryInfo.address || !deliveryInfo.number || !deliveryInfo.neighborhood) return true;
      if (deliveryInfo.fee === undefined || deliveryInfo.error) return true;
      // Para entrega, só aceitamos pagamento prévio (Pix ou Cartão de Crédito)
      if (paymentMethod !== 'Pix' && paymentMethod !== 'Cartão de Crédito') return true;
    }
    return false;
  }, [cart, customerName, consumptionMethod, paymentMethod, deliveryInfo, subOrders]);

  const handleCheckout = () => {
    const hasSweet = cart.some(item => item.subType === 'doce') || subOrders.some(o => o.cart.some(item => item.subType === 'doce'));
    if (!hasSweet && (cart.length > 0 || subOrders.length > 0)) {
      setShowUpsell(true);
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  const processCheckout = async () => {
    // Gerar número do pedido
    const newOrderNumber = Math.floor(100000 + Math.random() * 900000).toString();
    setOrderNumber(newOrderNumber);

    if (paymentMethod === 'Pix' || paymentMethod === 'Cartão de Crédito') {
      setIsProcessingPayment(true);
      // Simulação de processamento de pagamento online
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsProcessingPayment(false);
      setOrderStatus('paid');
    } else {
      setOrderStatus('paid');
    }

    setIsOrderComplete(true);
    setShowUpsell(false);
    setIsCheckoutModalOpen(false);

    // Enviar para WhatsApp
    sendToWhatsApp(newOrderNumber);

    setTimeout(() => {
      setIsOrderComplete(false);
      setCart([]);
      setSubOrders([]);
      setOrderLabel('');
      setConsumptionMethod(null);
      setPaymentMethod(null);
      setDeliveryInfo({ cep: '', address: '', number: '', neighborhood: '', complement: '', observations: '' });
      setCustomerName('');
      setOrderNumber(null);
      setOrderStatus('pending');
    }, 8000);
  };

  const sendToWhatsApp = (orderNum: string) => {
    let messageBody = `*🍔 NOVO PEDIDO - MEO PASTEL*\n`;
    messageBody += `*Pedido:* #${orderNum}\n`;
    messageBody += `*Cliente:* ${customerName}\n`;
    messageBody += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    const getMethodLabel = (method: ConsumptionMethod) => {
      switch(method) {
        case 'entrega': return 'ENTREGA';
        case 'viagem': return 'PARA VIAGEM';
        case 'imediato': return 'CONSUMO IMEDIATO';
        default: return '';
      }
    };

    // Add SubOrders
    subOrders.forEach((order, index) => {
      const items = order.cart.map(item => 
        `• ${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''} - R$ ${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');
      
      const methodText = getMethodLabel(order.consumptionMethod);
      const displayLabel = order.label ? `${methodText} (${order.label.toUpperCase()})` : methodText;

      messageBody += `📦 *PEDIDO ${index + 1}: ${displayLabel}*\n`;
      messageBody += `${items}\n`;
      if (order.consumptionMethod === 'entrega') {
        messageBody += `📍 *Entrega:* ${order.deliveryInfo.address}, ${order.deliveryInfo.number}\n`;
      }
      messageBody += `💰 *Subtotal:* R$ ${order.total.toFixed(2)}\n`;
      messageBody += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    });

    // Add Current Order (if not empty)
    if (cart.length > 0) {
      const currentItems = cart.map(item => 
        `• ${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''} - R$ ${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');
      
      const methodText = getMethodLabel(consumptionMethod!);
      const displayLabel = orderLabel.trim() ? `${methodText} (${orderLabel.trim().toUpperCase()})` : methodText;
      
      messageBody += `📦 *PEDIDO ${subOrders.length + 1}: ${displayLabel}*\n`;
      messageBody += `${currentItems}\n`;
      if (consumptionMethod === 'entrega') {
        messageBody += `📍 *Entrega:* ${deliveryInfo.address}, ${deliveryInfo.number}\n`;
      }
      messageBody += `💰 *Subtotal:* R$ ${currentOrderTotal.toFixed(2)}\n`;
      messageBody += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    messageBody += `*💵 TOTAL GERAL: R$ ${totalCart.toFixed(2)}*\n`;
    messageBody += `💳 *Pagamento:* ${paymentMethod}${paymentMethod === 'Pix' || paymentMethod === 'Cartão de Crédito' ? ' (Pago Online ✅)' : ' (Pagar na Entrega/Retirada)'}`;
    
    if (consumptionMethod === 'entrega' || subOrders.some(o => o.consumptionMethod === 'entrega')) {
      messageBody += `\n\n⚠️ *Atenção:* Pedidos para entrega requerem pagamento antecipado. Por favor, envie o comprovante.`;
    }

    messageBody += `\n\n_Pedido gerado via App Meo Pastel_`;

    const message = encodeURIComponent(messageBody);
    window.open(`https://wa.me/${COMPANY_WHATSAPP}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-pastel-yellow border-b border-pastel-brown/10 py-8 px-6 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-5xl font-bold tracking-tight text-pastel-brown leading-none">
              MEO <span className="text-pastel-orange">PASTEL</span>
            </h1>
            <p className="text-pastel-brown/70 mt-2 font-medium">Monte seu pastel perfeito com 3 recheios</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 && subOrders.length === 0}
              className={cn(
                "flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold transition-all shadow-lg shadow-pastel-orange/20 text-xs sm:text-base",
                (cart.length > 0 || subOrders.length > 0)
                  ? "bg-pastel-orange text-white hover:bg-pastel-orange/90 scale-100" 
                  : "bg-pastel-brown/10 text-pastel-brown/30 cursor-not-allowed scale-95"
              )}
            >
              <span className="hidden xs:inline">Finalizar Compra</span>
              <span className="xs:hidden">Finalizar</span>
              <ChevronRight size={18} />
            </button>
            <motion.div 
              animate={lastAddedId === 'cart-icon' ? { scale: [1, 1.2, 1] } : {}}
              className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-2xl border border-pastel-brown/5 flex items-center gap-3"
            >
              <ShoppingBasket className="text-pastel-orange w-5 h-5" />
              <div className="text-sm font-bold">
                <span className="text-pastel-brown/60 block text-[10px] uppercase tracking-wider">Seu Carrinho</span>
                R$ {totalCart.toFixed(2)}
              </div>
            </motion.div>

            {/* Quick App Links */}
            <div className="hidden sm:flex items-center gap-2 border-l border-pastel-brown/10 pl-4">
              <a 
                href="https://www.ifood.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#ea1d2c] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm"
                title="Pedir pelo iFood"
              >
                <span className="text-[10px] font-bold">iF</span>
              </a>
              <a 
                href="https://food.99app.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#ff8b00] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm"
                title="Pedir pelo 99Food"
              >
                <span className="text-[10px] font-bold">99</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Selection Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* AI Suggestions Tool */}
          {activeTab !== 'bebidas' && (
            <div className={cn(
              "rounded-3xl p-6 border transition-all duration-500",
              activeTab === 'salgados' 
                ? "bg-gradient-to-br from-pastel-orange/10 to-pastel-yellow/20 border-pastel-orange/20" 
                : "bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200/30"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl text-white transition-colors duration-500",
                    activeTab === 'salgados' ? "bg-pastel-orange" : "bg-pink-500"
                  )}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-pastel-brown">
                      {activeTab === 'salgados' ? 'Dúvida no Salgado?' : 'Desejo de Doce?'}
                    </h3>
                    <p className="text-xs text-pastel-brown/60">
                      {activeTab === 'salgados' 
                        ? 'Nossa IA sugere as melhores combinações salgadas!' 
                        : 'Nossa IA cria as sobremesas mais incríveis para você!'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={generateAISuggestions}
                  disabled={isGeneratingSuggestions}
                  className={cn(
                    "bg-white border px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50",
                    activeTab === 'salgados' 
                      ? "hover:bg-pastel-orange hover:text-white text-pastel-orange border-pastel-orange/30" 
                      : "hover:bg-pink-500 hover:text-white text-pink-500 border-pink-200"
                  )}
                >
                  {isGeneratingSuggestions ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      {activeTab === 'salgados' ? 'Sugerir Salgado' : 'Sugerir Doce'}
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {aiSuggestions.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    {aiSuggestions.map((suggestion, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => applySuggestion(suggestion)}
                        className={cn(
                          "bg-white p-4 rounded-2xl text-left border transition-all shadow-sm group",
                          activeTab === 'salgados' 
                            ? "border-pastel-orange/10 hover:border-pastel-orange/40" 
                            : "border-pink-100 hover:border-pink-300"
                        )}
                      >
                        <h4 className={cn(
                          "font-bold text-sm mb-1 group-hover:underline",
                          activeTab === 'salgados' ? "text-pastel-orange" : "text-pink-600"
                        )}>{suggestion.title}</h4>
                        <p className="text-[10px] text-pastel-brown/70 line-clamp-2 mb-2">{suggestion.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.fillings.map((f, i) => (
                            <span key={i} className="text-[8px] bg-pastel-brown/5 px-1.5 py-0.5 rounded-md font-medium">
                              {f}
                            </span>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : !isGeneratingSuggestions && (
                  <div className="text-center py-2">
                    <p className="text-[10px] text-pastel-brown/40 italic">
                      Clique para ver sugestões de {activeTab === 'salgados' ? 'combinações salgadas' : 'delícias doces'}
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tabs */}
          <div ref={menuRef} className="flex gap-1 sm:gap-2 p-1 bg-pastel-brown/5 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar whitespace-nowrap scroll-mt-32">
            <button
              onClick={() => { setActiveTab('salgados'); setSelectedFillings([]); setAiSuggestions([]); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold transition-all",
                activeTab === 'salgados' ? "bg-white shadow-sm text-pastel-orange" : "text-pastel-brown/40 hover:text-pastel-brown/60"
              )}
            >
              Salgados
            </button>
            <button
              onClick={() => { setActiveTab('doces'); setSelectedFillings([]); setAiSuggestions([]); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold transition-all",
                activeTab === 'doces' ? "bg-white shadow-sm text-pastel-orange" : "text-pastel-brown/40 hover:text-pastel-brown/60"
              )}
            >
              Doces
            </button>
            <button
              onClick={() => { setActiveTab('bebidas'); setSelectedFillings([]); setAiSuggestions([]); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold transition-all",
                activeTab === 'bebidas' ? "bg-white shadow-sm text-pastel-orange" : "text-pastel-brown/40 hover:text-pastel-brown/60"
              )}
            >
              Bebidas
            </button>
          </div>

          {(activeTab === 'salgados' || activeTab === 'doces') ? (
            <section id="filling-selection">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-3xl font-semibold">
                  {activeTab === 'salgados' ? 'Escolha os Recheios Salgados' : 'Escolha os Recheios Doces'}
                </h2>
                <div className="flex items-center gap-2 text-sm font-medium text-pastel-brown/60 bg-pastel-brown/5 px-3 py-1 rounded-full">
                  <Info size={14} />
                  <span>Escolha 3 recheios (pode repetir)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {FILLINGS.filter(f => f.type === (activeTab === 'salgados' ? 'salgado' : 'doce')).map((filling) => {
                  const count = selectedFillings.filter(f => f.id === filling.id).length;
                  const isDisabled = selectedFillings.length >= 3;
                  
                  return (
                    <motion.div
                      key={filling.id}
                      role="button"
                      tabIndex={0}
                      whileHover={!isDisabled ? { scale: 1.02 } : {}}
                      whileTap={!isDisabled ? { scale: 0.98 } : {}}
                      onClick={() => !isDisabled && addFilling(filling)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          !isDisabled && addFilling(filling);
                        }
                      }}
                      className={cn(
                        "pastel-card p-4 text-left transition-all relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-pastel-orange",
                        count > 0 ? "ring-2 ring-pastel-orange border-transparent bg-pastel-orange/5" : "hover:border-pastel-orange/30",
                        isDisabled && count === 0 && "opacity-40 grayscale cursor-not-allowed"
                      )}
                    >
                      <div className="flex flex-col h-full justify-between gap-2">
                        <div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-1",
                            filling.category === 'Básico' && "bg-blue-100 text-blue-700",
                            filling.category === 'Especial' && "bg-purple-100 text-purple-700",
                            filling.category === 'Premium' && "bg-amber-100 text-amber-700"
                          )}>
                            {filling.category}
                          </span>
                          <h3 className="font-bold text-lg leading-tight">{filling.name}</h3>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-mono text-sm font-semibold opacity-60">R$ {filling.price.toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            {count > 0 && (
                              <motion.button
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileTap={{ scale: 0.8 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFillingById(filling.id);
                                }}
                                className="bg-white border border-pastel-orange text-pastel-orange rounded-full h-6 w-6 flex items-center justify-center transition-colors hover:bg-pastel-orange hover:text-white"
                              >
                                <Minus size={14} />
                              </motion.button>
                            )}
                            {count > 0 && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-pastel-orange text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold"
                              >
                                {count}x
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-3xl font-semibold">Bebidas Geladas</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {BEVERAGES.map((beverage) => {
                  const cartItem = cart.find(item => item.type === 'beverage' && item.name === beverage.name);
                  const cartCount = cartItem ? cartItem.quantity : 0;
                  
                  return (
                    <motion.div
                      key={beverage.id}
                      role="button"
                      tabIndex={0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      animate={lastAddedId === beverage.id ? { 
                        backgroundColor: ['rgba(255,255,255,1)', 'rgba(255,132,0,0.2)', 'rgba(255,255,255,1)'],
                        scale: [1, 1.05, 1]
                      } : {}}
                      onClick={() => addBeverageToCart(beverage)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          addBeverageToCart(beverage);
                        }
                      }}
                      className={cn(
                        "pastel-card p-4 text-left transition-all relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-pastel-orange",
                        cartCount > 0 ? "ring-2 ring-pastel-orange border-transparent bg-pastel-orange/5" : "hover:border-pastel-orange/30"
                      )}
                    >
                      <AnimatePresence>
                        {lastAddedId === beverage.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: -20 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-0 right-4 text-pastel-orange font-bold"
                          >
                            +1
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="flex flex-col h-full justify-between gap-2">
                        <div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-1",
                            beverage.category === 'Refrigerante' && "bg-red-100 text-red-700",
                            beverage.category === 'Suco' && "bg-orange-100 text-orange-700",
                            beverage.category === 'Caldo de Cana' && "bg-green-100 text-green-700"
                          )}>
                            {beverage.category}
                          </span>
                          <h3 className="font-bold text-lg leading-tight">{beverage.name}</h3>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-mono text-sm font-semibold opacity-60">R$ {beverage.price.toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            {cartCount > 0 && (
                              <motion.button
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileTap={{ scale: 0.8 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeBeverageFromCart(beverage.name);
                                }}
                                className="bg-white border border-pastel-orange text-pastel-orange rounded-full h-6 w-6 flex items-center justify-center transition-colors hover:bg-pastel-orange hover:text-white"
                              >
                                <Minus size={14} />
                              </motion.button>
                            )}
                            {cartCount > 0 ? (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-pastel-orange text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold"
                              >
                                {cartCount}x
                              </motion.div>
                            ) : (
                              <div className="bg-pastel-orange/10 text-pastel-orange rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus size={16} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar / Builder */}
        <div className="space-y-6">
          {/* External Delivery Apps - Moved to top of sidebar for better visibility */}
          <div className="pastel-card p-6 bg-pastel-cream/30 border-dashed">
            <h3 className="text-sm font-bold text-pastel-brown/60 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Smartphone size={16} />
              Peça pelos Apps
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <a 
                href="https://www.ifood.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#ea1d2c] text-white hover:bg-[#d01a27] transition-colors font-bold text-sm shadow-sm"
              >
                <span>iFood</span>
                <ExternalLink size={16} />
              </a>
              <a 
                href="https://food.99app.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#ff8b00] text-white hover:bg-[#e67d00] transition-colors font-bold text-sm shadow-sm"
              >
                <span>99Food</span>
                <ExternalLink size={16} />
              </a>
            </div>
            <p className="text-[10px] text-pastel-brown/40 mt-3 text-center italic">
              * Preços e taxas podem variar nos aplicativos parceiros.
            </p>
          </div>

          {(activeTab === 'salgados' || activeTab === 'doces') && (
            <div className="pastel-card p-6 lg:sticky lg:top-32">
              <h2 className="font-serif text-2xl font-semibold mb-6 flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-pastel-orange" />
                Seu Pastel {activeTab === 'salgados' ? 'Salgado' : 'Doce'}
              </h2>

              <div className="space-y-4 mb-8 min-h-[180px]">
                <AnimatePresence mode="popLayout">
                  {selectedFillings.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-pastel-brown/10 rounded-2xl"
                    >
                      <p className="text-sm text-pastel-brown/40 italic">Selecione 3 recheios para começar</p>
                    </motion.div>
                  ) : (
                    selectedFillings.map((f, idx) => (
                      <motion.div
                        key={`${f.id}-${idx}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between bg-pastel-cream/50 p-3 rounded-xl border border-pastel-brown/5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-pastel-orange text-white text-xs font-bold rounded-full">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{f.name}</span>
                        </div>
                        <button 
                          onClick={() => removeFillingByIndex(idx)}
                          className="text-pastel-brown/30 hover:text-red-500 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
                
                {/* Placeholders for remaining slots */}
                {Array.from({ length: Math.max(0, 3 - selectedFillings.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-12 border-2 border-dashed border-pastel-brown/5 rounded-xl" />
                ))}
              </div>

              <div className="border-t border-pastel-brown/10 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-pastel-brown/60 uppercase tracking-widest">Preço do Pastel</span>
                  <span className="text-2xl font-bold text-pastel-orange">R$ {currentPrice.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-pastel-brown/40 leading-tight">
                  * O preço é definido pelo ingrediente de maior valor entre os escolhidos.
                </p>
                
                <button 
                  onClick={addPastelToCart}
                  disabled={selectedFillings.length < 3}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          )}

          {/* Cart Summary */}
          {cart.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pastel-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-semibold flex items-center gap-2">
                  Carrinho
                  <span className="bg-pastel-orange text-white text-[10px] px-2 py-0.5 rounded-full">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                </h3>
                <button 
                  onClick={handleCheckout}
                  className="text-xs font-bold text-pastel-orange hover:underline flex items-center gap-1"
                >
                  Finalizar <ChevronRight size={14} />
                </button>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.id} className="group relative bg-white border border-pastel-brown/5 p-3 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs font-bold text-pastel-orange uppercase tracking-tighter">
                        {item.type === 'pastel' ? (item.subType === 'doce' ? 'Pastel Doce' : 'Pastel Salgado') : 'Bebida'}
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="text-sm font-bold pr-6">{item.name}</div>
                    {item.details && (
                      <div className="text-xs text-pastel-brown/60 mb-2">
                        {item.details}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 bg-pastel-cream rounded-lg p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white transition-colors text-pastel-brown/60"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white transition-colors text-pastel-brown/60"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right font-mono font-bold text-sm">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-pastel-brown/10 mt-6 pt-4">
                <div className="flex items-center justify-between font-bold text-lg mb-4">
                  <span>Total</span>
                  <span>R$ {totalItems.toFixed(2)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                >
                  Finalizar Pedido
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Upsell Modal */}
      <AnimatePresence>
        {showUpsell && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-6 bg-pastel-brown/95 backdrop-blur-xl"
          >
            {/* Flash Effect Overlay */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 bg-white z-[120] pointer-events-none"
            />

            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-none sm:rounded-[48px] w-full max-w-2xl h-full sm:h-auto max-h-[90vh] text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col"
            >
              <button 
                onClick={() => { setShowUpsell(false); setIsCheckoutModalOpen(true); }}
                className="absolute top-6 right-6 z-20 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full p-2 transition-all"
              >
                <X size={24} />
              </button>

              <div className="relative h-[50%] sm:h-80 overflow-hidden group">
                <motion.img 
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
                  src="https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1200&auto=format&fit=crop" 
                  alt="Pastel Doce Gourmet Irresistível" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20" />
                <div className="absolute bottom-0 left-0 w-full p-8 text-left">
                  <motion.span 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-pastel-orange text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg"
                  >
                    Sugestão do Chef
                  </motion.span>
                </div>
              </div>

              <div className="p-8 sm:p-12 pt-6 flex-1 flex flex-col justify-center bg-gradient-to-b from-white to-pastel-cream/20">
                <h2 className="font-serif text-3xl sm:text-5xl font-bold mb-4 text-pastel-brown leading-tight">
                  Um toque de <span className="text-pastel-orange italic">doçura</span> para finalizar?
                </h2>
                <p className="text-lg text-pastel-brown/70 mb-10 max-w-md mx-auto leading-relaxed">
                  Nossos clientes amam combinar o pastel salgado com uma de nossas sobremesas artesanais. Experimente o nosso <span className="font-bold text-pastel-brown">Pastel de Ninho com Nutella e Morangos!</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto w-full">
                  <button 
                    onClick={() => { setShowUpsell(false); setActiveTab('doces'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="btn-primary flex-1 py-5 text-lg shadow-lg shadow-pastel-orange/20 hover:shadow-pastel-orange/40 transition-all"
                  >
                    Quero um Doce!
                  </button>
                  <button 
                    onClick={() => { setShowUpsell(false); setIsCheckoutModalOpen(true); }}
                    className="btn-outline flex-1 py-5 border-pastel-brown/10 text-pastel-brown/40 hover:text-pastel-brown transition-all"
                  >
                    Finalizar sem doce
                  </button>
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pastel-orange/5 rounded-full blur-3xl" />
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-pastel-orange/5 rounded-full blur-3xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[115] flex items-center justify-center p-0 sm:p-6 bg-pastel-brown/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-none sm:rounded-[40px] w-full max-w-2xl h-full sm:h-auto max-h-[95vh] text-left shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div className="p-6 sm:p-10 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-serif text-3xl font-bold text-pastel-brown">Finalizar Pedido</h2>
                  <button 
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="text-pastel-brown/40 hover:text-pastel-brown transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Customer Name */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-pastel-brown/40 uppercase tracking-widest">Seu Nome (Obrigatório)</label>
                      <input 
                        type="text" 
                        placeholder="Como podemos te chamar?"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm font-bold"
                      />
                    </div>

                    {/* Consumption Method */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-pastel-brown/40 uppercase tracking-widest">Como vai consumir?</label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'imediato', label: 'Consumo Imediato' },
                          { id: 'viagem', label: 'Para Viagem' },
                          { id: 'entrega', label: 'Entrega' }
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setConsumptionMethod(method.id as ConsumptionMethod)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold",
                              consumptionMethod === method.id 
                                ? "border-pastel-orange bg-pastel-orange/5 text-pastel-orange" 
                                : "border-pastel-brown/5 hover:border-pastel-brown/20 text-pastel-brown/60"
                            )}
                          >
                            {method.label}
                            {consumptionMethod === method.id && <CheckCircle2 size={16} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Order Identification */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-pastel-brown/40 uppercase tracking-widest">Identificação deste pedido (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Para Viagem, Mesa 5, Para o João..."
                        value={orderLabel}
                        onChange={(e) => setOrderLabel(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm font-bold"
                      />
                    </div>

                    {/* Add Another Order Button */}
                    <button
                      onClick={addSubOrder}
                      disabled={cart.length === 0 || !consumptionMethod || (consumptionMethod === 'entrega' && (deliveryInfo.fee === undefined || !!deliveryInfo.error))}
                      className="w-full py-4 rounded-xl border-2 border-dashed border-pastel-brown/20 text-pastel-brown/60 text-sm font-bold flex items-center justify-center gap-2 hover:border-pastel-brown/40 hover:text-pastel-brown transition-all"
                    >
                      <Plus size={18} />
                      Adicionar outro pedido a este pagamento
                    </button>

                    {/* Delivery Form */}
                    <AnimatePresence>
                      {consumptionMethod === 'entrega' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-1 relative">
                                <input 
                                  type="text" 
                                  placeholder="CEP"
                                  value={deliveryInfo.cep}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setDeliveryInfo(prev => ({ ...prev, cep: val }));
                                    if (val.length === 8) fetchAddressFromCep(val);
                                  }}
                                  className="w-full px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm font-bold"
                                />
                                {isSearchingCep && (
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <Loader2 size={14} className="animate-spin text-pastel-orange" />
                                  </div>
                                )}
                              </div>
                              <input 
                                type="text" 
                                placeholder="Endereço (Rua/Av)"
                                value={deliveryInfo.address}
                                onChange={(e) => setDeliveryInfo(prev => ({ ...prev, address: e.target.value }))}
                                className="col-span-2 px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input 
                                type="text" 
                                placeholder="Nº"
                                value={deliveryInfo.number}
                                onChange={(e) => setDeliveryInfo(prev => ({ ...prev, number: e.target.value }))}
                                className="col-span-1 px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm"
                              />
                              <input 
                                type="text" 
                                placeholder="Bairro"
                                value={deliveryInfo.neighborhood}
                                onChange={(e) => setDeliveryInfo(prev => ({ ...prev, neighborhood: e.target.value }))}
                                className="col-span-2 px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm"
                              />
                            </div>
                            <input 
                              type="text" 
                              placeholder="Complemento (Apto, Bloco, etc)"
                              value={deliveryInfo.complement}
                              onChange={(e) => setDeliveryInfo(prev => ({ ...prev, complement: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm"
                            />
                            <textarea 
                              placeholder="Observações (ex: ponto de referência)"
                              value={deliveryInfo.observations}
                              onChange={(e) => setDeliveryInfo(prev => ({ ...prev, observations: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-pastel-brown/10 focus:outline-none focus:ring-2 focus:ring-pastel-orange/20 text-sm min-h-[80px] resize-none"
                            />

                            <button
                              onClick={calculateDeliveryFee}
                              disabled={isCalculatingDistance || isSearchingCep || !deliveryInfo.cep || !deliveryInfo.address || !deliveryInfo.number || !deliveryInfo.neighborhood}
                              className="w-full py-4 rounded-xl bg-pastel-brown text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-pastel-brown/90 transition-all disabled:opacity-50 shadow-lg shadow-pastel-brown/10"
                            >
                              {isCalculatingDistance ? (
                                <>
                                  <Loader2 size={18} className="animate-spin" />
                                  <span>Localizando Endereço...</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 size={18} />
                                  <span>Calcular Frete e Distância</span>
                                </>
                              )}
                            </button>

                            {deliveryInfo.error && (
                              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                <Info size={14} />
                                {deliveryInfo.error}
                              </div>
                            )}

                            {deliveryInfo.distance !== undefined && !deliveryInfo.error && (
                              <div className="p-4 rounded-xl bg-pastel-orange/5 border border-pastel-orange/10 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-pastel-brown/40 font-bold uppercase tracking-widest">Distância:</span>
                                  <span className="text-pastel-brown font-bold">{(deliveryInfo.distance / 1000).toFixed(2)} km</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-pastel-brown/40 font-bold uppercase tracking-widest">Taxa de Entrega:</span>
                                  <span className="text-pastel-orange font-bold">{deliveryInfo.fee === 0 ? 'GRÁTIS' : `R$ ${deliveryInfo.fee?.toFixed(2)}`}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-6">
                    {/* Payment Method */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-pastel-brown/40 uppercase tracking-widest">Forma de Pagamento</label>
                        {consumptionMethod === 'entrega' && (
                          <span className="text-[10px] text-pastel-orange font-bold uppercase tracking-wider animate-pulse">
                            ⚠️ Entrega requer pagamento antecipado
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {PAYMENT_METHODS.map((method) => {
                          const isDisabled = consumptionMethod === 'entrega' && method.id !== 'Pix' && method.id !== 'Cartão de Crédito';
                          return (
                            <button
                              key={method.id}
                              disabled={isDisabled}
                              onClick={() => setPaymentMethod(method.id)}
                              className={cn(
                                "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold",
                                paymentMethod === method.id 
                                  ? "border-pastel-orange bg-pastel-orange/5 text-pastel-orange" 
                                  : "border-pastel-brown/5 hover:border-pastel-brown/20 text-pastel-brown/60",
                                isDisabled && "opacity-30 cursor-not-allowed grayscale"
                              )}
                            >
                              {method.label}
                              {paymentMethod === method.id && <CheckCircle2 size={16} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sub Orders List */}
                    {subOrders.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-pastel-brown/40 uppercase tracking-widest">Pedidos Adicionados</label>
                        <div className="space-y-2">
                          {subOrders.map((order, index) => (
                            <div key={order.id} className="bg-white p-4 rounded-2xl border border-pastel-brown/5 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-pastel-brown">
                                  {order.consumptionMethod === 'entrega' ? 'Entrega' : (order.consumptionMethod === 'viagem' ? 'Para Viagem' : 'Consumo Imediato')}
                                  {order.label && ` (${order.label})`}
                                </p>
                                <p className="text-xs text-pastel-brown/60">{order.cart.length} itens • R$ {order.total.toFixed(2)}</p>
                              </div>
                              <button 
                                onClick={() => removeSubOrder(order.id)}
                                className="text-red-400 hover:text-red-600 transition-colors p-2"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order Summary */}
                    <div className="bg-pastel-cream/50 p-6 rounded-3xl space-y-3">
                      {subOrders.length > 0 && (
                        <div className="flex justify-between text-sm text-pastel-brown/60">
                          <span>Pedidos Anteriores ({subOrders.length})</span>
                          <span>R$ {subOrdersTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-pastel-brown/60">
                        <span>Pedido Atual</span>
                        <span>R$ {currentOrderTotal.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t border-pastel-brown/10 flex justify-between items-center">
                        <span className="font-bold text-pastel-brown">Total Geral</span>
                        <span className="text-2xl font-bold text-pastel-orange">R$ {totalCart.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-10 bg-pastel-cream/30 border-t border-pastel-brown/5">
                <button 
                  onClick={processCheckout}
                  disabled={isCheckoutDisabled || isProcessingPayment}
                  className="btn-primary w-full py-5 text-lg shadow-xl shadow-pastel-orange/20 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processando Pagamento...
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'Pix' || paymentMethod === 'Cartão de Crédito' ? 'Pagar e Finalizar Pedido' : 'Confirmar e Finalizar Pedido'}
                    </>
                  )}
                </button>
                {(paymentMethod === 'Pix' || paymentMethod === 'Cartão de Crédito') && (
                  <p className="text-[10px] text-center mt-3 text-pastel-brown/40">
                    🔒 Pagamento processado de forma segura.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {isOrderComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-pastel-brown/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-pastel-orange" />
              <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="font-serif text-4xl font-bold mb-4">Pedido Recebido!</h2>
              <div className="bg-pastel-orange/10 text-pastel-orange font-mono font-bold py-2 px-4 rounded-full inline-block mb-4">
                #{orderNumber}
              </div>
              <p className="text-pastel-brown/60 mb-6">
                Olá <span className="font-bold text-pastel-brown">{customerName}</span>, seu pedido já está sendo preparado com todo carinho. 
                {consumptionMethod === 'entrega' ? ' Em breve sairá para entrega!' : ' Em instantes estará pronto!'}
              </p>
              <div className="space-y-2">
                <div className="text-left text-xs bg-pastel-cream p-4 rounded-2xl border border-pastel-brown/5 space-y-1">
                  <div className="flex justify-between">
                    <span className="opacity-60 uppercase tracking-wider font-bold">Pedido:</span>
                    <span className="font-mono font-bold text-pastel-orange">#{orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60 uppercase tracking-wider font-bold">Total Pago:</span>
                    <span className="font-mono font-bold">R$ {totalCart.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60 uppercase tracking-wider font-bold">Pagamento:</span>
                    <span className="font-bold">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60 uppercase tracking-wider font-bold">Consumo:</span>
                    <span className="font-bold capitalize">{consumptionMethod}</span>
                  </div>
                </div>
                {consumptionMethod === 'entrega' && (
                  <div className="text-left text-xs bg-pastel-yellow/20 p-4 rounded-2xl border border-pastel-yellow/30">
                    <div className="font-bold uppercase tracking-wider mb-1 opacity-60">Endereço de Entrega:</div>
                    <div>{deliveryInfo.address}, {deliveryInfo.number}</div>
                    <div>{deliveryInfo.neighborhood}</div>
                    {deliveryInfo.observations && (
                      <div className="mt-2 italic opacity-70">Obs: {deliveryInfo.observations}</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-pastel-brown text-pastel-cream py-12 px-6 mt-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-serif text-3xl font-bold mb-2">MEO PASTEL</h2>
            <p className="opacity-60 text-sm">A melhor massa, o melhor recheio, do seu jeito.</p>
          </div>
          <div className="text-right text-xs opacity-40">
            &copy; {new Date().getFullYear()} MEO PASTEL. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
