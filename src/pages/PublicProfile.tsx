import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { User, Review } from '@/types';
import { useUserStore } from '@/store/userStore';
import { Loader2, Star, MapPin, Briefcase, User as UserIcon, ShieldCheck, ChevronLeft, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!id) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setProfile(userData);

          // Fetch reviews for this professional
          const reviewsQuery = query(collection(db, 'reviews'), where('professionalId', '==', id));
          const reviewsSnap = await getDocs(reviewsQuery);
          const reviewsData = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
          
          reviewsData.sort((a, b) => b.created_at - a.created_at);
          setReviews(reviewsData);
        }
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

  if (!profile) return <div className="text-center py-20 text-slate-500">Perfil não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-primary mb-6 font-medium transition-colors"
      >
        <ChevronLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="h-32 bg-slate-900"></div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12 sm:-mt-16 mb-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full border-4 border-white shadow-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-slate-400" />
              )}
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                    {profile.name}
                    {profile.verified && <ShieldCheck className="w-6 h-6 text-success" />}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.city}, {profile.state}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 
                      {profile.rating?.toFixed(1) || 'Novo'} ({profile.reviewCount || 0} avaliações)
                    </span>
                  </div>
                </div>

                {user?.role === 'client' && user.id !== id && (
                  <button
                    onClick={() => navigate(`/new?profId=${id}`)}
                    className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Solicitar Orçamento
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <div className="md:col-span-2 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" /> Sobre o profissional
                </h2>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  {profile.bio || 'Este profissional ainda não adicionou uma descrição ao perfil.'}
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Serviços prestados</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.services && profile.services.length > 0 ? (
                    profile.services.map(service => (
                      <span key={service} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm border border-primary/20">
                        {service}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Nenhum serviço especificado.</span>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-4">Estatísticas</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between items-center">
                    <span className="text-slate-500">Membro desde</span>
                    <strong className="text-slate-700">{format(profile.created_at, "MMM 'de' yyyy", { locale: ptBR })}</strong>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-slate-500">Serviços concluídos</span>
                    <strong className="text-slate-700">{profile.reviewCount || 0}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Avaliações dos Clientes</h2>
        
        {reviews.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
            <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Ainda não há avaliações para este profissional.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map(review => (
              <div key={review.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {format(review.created_at, "dd/MM/yyyy")}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed mb-3">"{review.comment}"</p>
                {review.wouldHireAgain && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 w-fit px-2 py-1 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5" /> Recomendado pelo cliente
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;