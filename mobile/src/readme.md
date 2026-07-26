(CORREGIDO) cosas pendientes que tengo que hacer, por un lado cuidado en el login con al sacar los errores en el formulario que se descuadra todo, tengo captura en el movil del dia 15/12. 

mejorar el listado de estudios creo que se puede hacer algo mejor y mas chulo

mejorar la navegacion con gestos de atras nativos del movil por asi decirlo para no depender del header todo el rato.

(CORREGIDO) Al hacer un audio, aunque guarde la tarea, si me salgo y vuelvo no esta. Mejorar esto e intentar tener las fotos y audios en memoria de la aplicacion para luego a la hora de subirlo que sea facil asociarlo.

(CORREGIDO) La pantalla de informacion dentro del detalle se corta, tengo captura en el movil.

(CORREGIDO) Introducimos en la tarea que sea dos arboles por ejemplo rellenamos su informacion y si vamos a formulario salen los datos del ultmio introducido, cambiamos a otro y funciona, pero si navegamos a otro ya no refresca los datos correctamente.

Comprobar el tema de seguridad si intento subir la tarea de pepito a antonio investigador ver que sucede



MEMORIA herramienta de leaflet ponerla al principio del capitulo, PONERLO ANTES DEL 3.3 DESARROLLO (PENDIENTE)


RECOEMDANDOR DE ESPECIES CON PUNTUACION DE LAS ESPECIES QUE NOS HEMOS ENCONTRADO, añadir lo de gennus y species y por familia. (CORREGIDO)


el sotobosque hacerlo con transectos, es decir yo selecciono el transecyo y sobre ese que se haga la especie (CORREGIDO)

ligar imagenes (PENDIENTE)

GENERAR PDF DEL ESTUDIO PARA HACER EL RECOMENDADOR DE ESPECIES. (NO SE A QUE ME REFERIA CON ESTO)




RESUMEN REUNIÓN DEL 18/12

Pascual me comentó lo de añadir el estudio antes del punto 3 algo lo tengo por aqui arriba escrito, tambien comentamos lo del recomendador de especie, que tendremos que hacer un estudio para incluirlo en el TFG ya que lo tenemos que modificar con el nuevo excel que nos paso pascual de las especies de españa, poner todas, importante eso que me dijeron que puedas buscar por nombre cientifico, especie, genero, familia, recodar el ejemplo de ACER. Luego comentamos lo de que no tiene que ser recomendador, tienen que aparecer todas las especies por asi decirlo y la manera de funcionar debe de ser crear una lista e ir puntuando 1 a la seleccionda para que en la siguiente seleccion nos salga mas arriba la que mas punto tenga etc, es decir que automáticamente se ordene. Luego tambien importante, para los estudios de sosobosque no es importante geolocalizar la especie seria mejor hacer por transecto de tal manera que una vez creados los transectos, seleccionemos uno y ya introduzcamos todas las especies nos da un poco igual su localizacion, mas que nada nos interesa los que haya en el computo global mas que 1 a 1. Por ultimo el tema del excel, lo que comentamos en las pestañas tendran que ser las tareas, recoger en el formulario el momento del estudio, como hablamos de pre post after, y luego estaran las zonas de quema alta, quema baja, sin quema. Terminar de completar el user story mapping para que ambos tutores puedan revisarlos con las nuevas tareas que hemos hablado. Tambien comentamos lo de que los audios e imagenes serian de gran ayuda ver como podemos solucionarlo, otra idea que se me ha ocurrido es que al guardarlas se cree una carpeta en el movil con el nombre de la tarea y ahi se guarde todo, ver si podemos hacerlo asi. Ver lo de las coordenadas que paso el tutor por el teams a ver que podemos hacer con eso.


pruebas a priori que tenemos que hacer, lo primero al introducir el formulario de la especia ya sea arbol etc aparece el scroll lo tenemos que quitar, luego cuando marcamos la especie y luego se carga el formulario no aparece la especie cargada y luego acordarse de comprobar que el recomendador va haciendo el calculo de las especies que hemos ido marcando y que vaya ordenandolo por esa puntuacion. (CORREGIDO)


hacer lo de que no tenga referencia geografica el sotobosque (SOLO TENEMOS QUE AÑADIR UNA POR TRANSECTO, CORREGIDO PENDIENTE DE VALIDACION)

ver la manera de que la tarea en la app solo nos muestre la zona en la que tenemos que realizar la tarea (LO HE PENSADO MEJOR CREO QUE NO MOLESTA QUE SALGA TODO CON EL NUEVO SISTEMA DE 11 112 113 ETC)




ver si podemos añadir un boton en el mapa que nos permita hacer un cambio entre mostrar los nombres de las areas o el punto de las coordenadas (PENDIENTE)

solucionar la fusion de las tareas cuando tenemos un sotobosque ya que se ha cambiado la generacion del json de sotobosque (PENDIENTE)

ver como gestionar lo del momento del estudio, lo que hablamos del pre post after (PENDIENTE)

tema audios e imagenes para subirlos adjunto de la mejor manera (PENDIENTE)



PENDIENTE DIA 27/01

(CORREGIDO) Tenemos que revisar el caso de error que he visto haciendo pruebas que es si por ejemplo tenemos 3 momentos y los eliminamos de uno a uno en la lista. Llegamos a tener ningun momento pero el check habilitado lo que hace que se produzca un estado que no tiene coherencia del estudio. Tampoco podemos dejar añadir dos momentos con el mismo nombre

(CORREGIDO) Entonces, una vez solucionado el punto de arriba que tenemos que hacer, llevar la coherencia de los momentos a las tareas, es decir simplemente a la hora de realizar una tarea seleccionar el momento en el que estamos, que hara ese momento nada raro simplemente si el momento es previa-quema, pues cuando descarguemos la tarea el json tendra ese nombre + lo que ya tuviese.

(PENDIENTE) Luego tenemos que remodelar el sistema de subida de archivos porque ahora se subiran dependiendo del momento tendremos que ir a la tarea y subirlo en el momento adecuado para asi luego poder hacer la fusion de manera correcta y general el excel como hablamos por aqui arriba, las tareas seran las pestañas y los momentos las columnas para ver las diferencias.


Cosas en mente para comentar mañana, de momento las tareas de arbol las he dejado de añadir manualmente el punto de ubicacion, las de sotobosque no, se añaden sin indicar el espacio, luego tener en cuenta lo pensado de poder eliminar especies del formulario.
