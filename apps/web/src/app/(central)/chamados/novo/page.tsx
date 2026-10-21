import NovoChamado from "@/components/forms/NovoChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { PERFIS_QUE_ABREM_CHAMADO } from "@/utils/perfis";

export default function Page() {
  return <PerfilRequerido perfis={PERFIS_QUE_ABREM_CHAMADO}><NovoChamado /></PerfilRequerido>;
}
