import { PointData, HubVideo, DrawerKey, CommentItem, LiveStreamCard } from '../models/trip-shorts.models';

export const POINT_DATA_MOCK: Record <DrawerKey, PointData> = {
  resort: {
    title: "Amanoi Ocean Villa",
    location: "Vịnh Vĩnh Hy, Ninh Thuận • Biệt Lập Hướng Biển",
    price: "$1,200",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVkyGxMr07THi-lWD1xhNFq3PmkiRE-RCC4xCZARTvM-d2dnWna8Tc4tmReJY4HmvinEr-SVx0uG7HZvt2CD-NhW7bt5-P_zMAPNbmmxov848MeKttxjJ_LGVhi8MMuL2DAD4-i253qsDzJp44S_BLQPdi0xKW8W7Wn3RnLkcCWUGx6JrjDwbGKrId64SnbtjYxaMSzjMHQuEtF4-HEjLeQF--02krFgd2ARHWt9WU"
  },
  dining: {
    title: "Cliffside Sunset Dining",
    location: "Vách Đá Núi Chúa • Bàn Tiệc Michelin Riêng Biệt",
    price: "$450",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdtMiPVjMExVepsuR_DjM1oT9joNWZfiIPZtKedueyQDrC_-5jNtzL1oPRl8vvkkJnPxjFbXp8nL4DxXxj3s97af3fRRNdr_9r7BLCWG2Qqw9GLAYoZNTjB0VbjxPwBvNyZbHfeZUMGOBXZKYr2WrZbdTXa5ym8L584hB_yUBQ3bVVChfFaA7j2FZqNior9IDWY7uYWtFvq1mvJMibRM-kHe8suUiI6JVOXOVAvsC_"
  },
  yacht: {
    title: "Catamaran Yacht Tour",
    location: "Quần Đảo An Thới, Phú Quốc • Hải Trình Riêng 48ft",
    price: "$850",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNZB_fDlrYOzNmeCyOgVoiEY0EviB_cvVweti9Dozx0ewb47a8xtgYL7Xkns7c0eV5FasuZKM0cDYGwPNqHUE1FKlafd0ruQTKmEz83JBU6IxaripdT-zydZMMHhHa8ijf4iUzucgIIwoY3w8YTfUo9O9MrvKbXZoMcKJ5Z2neq8N42qFxcXgT33LYB9zui2nUBKmA0pcZ3KLPuKU0x1JCQS0UJhLzTI2pzoQeCtUC"
  }
};

export const HUB_VIDEOS_MOCK: HubVideo[] = [
  {
    title: "Amanoi Vĩnh Hy & Vịnh Đá Xanh",
    desc: "Kỳ nghỉ biệt lập tại Vịnh Vĩnh Hy. Thưởng thức hoàng hôn dát vàng trên du thuyền 48ft và bữa tối vách đá 🌊✨",
    location: "Vịnh Vĩnh Hy • Amanoi",
    creator: "@luxury_escapes",
    creatorAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_J9W9E-wzAn1hVED7Nfg4Ww8k1m5d4N27P9oocWAccd5_VNlacjYOhGZ33zPID1VgnOTUoZ6Lm1MBD-I5QlZqoAm6uynXcdMPGmNba4svOL0cYn-jQ2uEpYPVY4DyPfw9sfzBAv-lLocniW-NvVJI3LQmA8kod16vItuDQ0rIH2HmRAq05tAQwFwmbIOjjdbyAdw7opCQAECAoXhs9DlvI1CF19dAtiVT3TgbP3zj",
    media: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVkyGxMr07THi-lWD1xhNFq3PmkiRE-RCC4xCZARTvM-d2dnWna8Tc4tmReJY4HmvinEr-SVx0uG7HZvt2CD-NhW7bt5-P_zMAPNbmmxov848MeKttxjJ_LGVhi8MMuL2DAD4-i253qsDzJp44S_BLQPdi0xKW8W7Wn3RnLkcCWUGx6JrjDwbGKrId64SnbtjYxaMSzjMHQuEtF4-HEjLeQF--02krFgd2ARHWt9WU",
    drawerKey: 'resort'
  },
  {
    title: "Du thuyền Hoàng Hôn Phú Quốc",
    desc: "Hải trình riêng tư 48ft ngắm mặt trời lặn tại quần đảo An Thới, thưởng thức canapé và vang ướp lạnh 🥂🌅",
    location: "Phú Quốc • Private Bay",
    creator: "@marine_voyage",
    creatorAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCou62IZE2hd0c0LBfH-HCckFvCFrKJoXX7avfR0GJSSgW63L5h2LLaYZaEze5y29PO0zFHI4kP7acgvALfyyAcjvL4_tsJz4dbTy0xzm7dSxYnyJzTbh8pXCLtOWSoGefHIuxgEs0NJGx0rbwbRXj7Kbcs6jXwK7SDBoto78zY9wUEVe1FMW3u7TqBomRIPjPRiHNQl38RIEqtLuhX2vaieSmbc0LfwAEZlBOgiaWT",
    media: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNZB_fDlrYOzNmeCyOgVoiEY0EviB_cvVweti9Dozx0ewb47a8xtgYL7Xkns7c0eV5FasuZKM0cDYGwPNqHUE1FKlafd0ruQTKmEz83JBU6IxaripdT-zydZMMHhHa8ijf4iUzucgIIwoY3w8YTfUo9O9MrvKbXZoMcKJ5Z2neq8N42qFxcXgT33LYB9zui2nUBKmA0pcZ3KLPuKU0x1JCQS0UJhLzTI2pzoQeCtUC",
    drawerKey: 'yacht'
  },
  {
    title: "Thưởng thức Ẩm Thực Vách Đá",
    desc: "Bàn tiệc riêng giới hạn chỉ 2 lượt/tối trên mỏm vách đá Núi Chúa, ngắm sóng vỗ và thực đơn Michelin 7 món đỉnh cao ✨🍽️",
    location: "Núi Chúa • Cliff Dining",
    creator: "@chef_marco",
    creatorAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBQh5X09cSvoo1sZe3q6rvW1QwW9uj_5pQzLPBePPzrA14DNB9upT957jjrGrdSNx3rEdMRMhvOooXXcG3Qt7he5fJJ5tg7ZElob1iatSpm43bnPbPm8GkL83UOXu5T5lqmLLKIfk8XeRjyYUVmYw9vmuSfr2d7NPkzuzYNOMAvROxGTwnCMhRJivQwp86ewJfU3aeivl7v8xiNwVixNKF_d9OpTCFQrstG8SbLZiWs",
    media: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdtMiPVjMExVepsuR_DjM1oT9joNWZfiIPZtKedueyQDrC_-5jNtzL1oPRl8vvkkJnPxjFbXp8nL4DxXxj3s97af3fRRNdr_9r7BLCWG2Qqw9GLAYoZNTjB0VbjxPwBvNyZbHfeZUMGOBXZKYr2WrZbdTXa5ym8L584hB_yUBQ3bVVChfFaA7j2FZqNior9IDWY7uYWtFvq1mvJMibRM-kHe8suUiI6JVOXOVAvsC_",
    drawerKey: 'dining'
  },
  {
    title: "Trực thăng ngắm Vịnh Hạ Long",
    desc: "Bay lượn trên kỳ quan thế giới với chuyên cơ Bell 505 hiện đại, chiêm ngưỡng hàng nghìn hòn đảo đá vôi xanh ngọc bích 🚁🏝️",
    location: "Hạ Long • Heli SkyTour",
    creator: "@sky_luxury",
    creatorAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuApqN20IDlIqQhHM-SPmUC6NeVgX2-b-0QO7Uvfn53N0sTBP4oqiEO8qrFlWpKibZDmlq7vE_Irmxh0wvsNi7pS4u6oqXtdgteepplfJrngBqVTzryrlrdPHHfvO_dBtrtN3QFuASE0tumm3L2HdodmNCS1bD1fQknYHU3Vr2MML8jPpjDlRmucXZgb5C5m4rpmtywbkP8tVaAkJHd56NLNsiukihNgVi8eNj5JZgH6",
    media: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIGIet93rqk7XM-gab5qspxwfmKVjhzpwYYjZ4zxgwZm8Wa-BsAe2iOxwm2q5lIxorDaxqTIYW0gsFmYpvc0yZJgIelthuY6JmCFKFHys6zZH_mpwMnL-F8imnvWNPQ07OLKqQLeeK9crWFGNR6lm3CNmA3jUH22vHbvMD0KxDmuK68QU9ALJWm1SnGIbXE60KElXOnX7gy7gXWOYgkc2UY-27Ie0qS6yB3qaxozC8",
    drawerKey: 'resort'
  },
  {
    title: "Đảo Ngọc Coral Reef Diving",
    desc: "Chuyến lặn sâu độc quyền cùng chuyên gia PADI Master, khám phá rạn san hô nguyên sơ nhất vịnh Thái Lan 🤿🪸",
    location: "An Thới • Private Coral Bay",
    creator: "@ocean_wander",
    creatorAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAqnBTgROwYczNTkYPnbGk2lCefl-CeXgnMmDig2W-bxDiKURUmPkgKhRKivdUUjQ-aMOrO71jdjoAdXee3Iar90dXUeTYeR-btyblgRZxl0pc837uGxP7U47AVFhzY50eO2N9ref7kpCJnemb1U6x5aFHGfnqZ8zLSJ_oUnyAEJ5uMZAaSPRJWpWJYvQ6VyJN80IP_tHxIG5YavuwVM77FQZ0uQzKvoUwip7-IyxEf",
    media: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKdoLvTNlKhVKYXvGH5F7ublgmROHh7vR958m6lwKbQImVf4MJRN9RKJQmpZ0f-4NFTkZF40gEDShqcr2RMt24DWZ_P4yxjLjaSvHwtEwwiYkqZ50pfyKqJVv-56d6U0LDzV1yAoSe7XedsCxfY5WFKNDehCJCjnkShHeY4fpy7nO-PqFVb5J039HHBqmnNFUnBZYsYNAeTlvmgRZ5OrC5NXF2r0uXLn1z8a7ZU-AX",
    drawerKey: 'yacht'
  },
  {
    title: "Suối khoáng nóng Onsen Retreat",
    desc: "Thư giãn tâm trí giữa không gian onsen tự nhiên 100% dẫn từ nguồn khoáng sâu, tinh hoa trị liệu Nhật Bản độc bản 🌿♨️",
    location: "Quang Hanh • Mineral Spring Villa",
    creator: "@zen_retreats",
    creatorAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZsJIl0jg_JH4zMaN_CIwWdznNEcBEAr3o5ygXVs2WnubE0fdA6exjWAGHgNr64_guY9vybIMWjsn_6xzRvItj71Vet9ewAnbLqjWTLYRYS87nDgi5IxS-ABGfUWKRXGeou58jJHPoCKpfYls19l1EY0GQcJjU_-4_0-xkva_I-D3UU_PimepVlGTwowmiJHnNAyyoId5AbAH0pPrWXmDkfETnsj0uDaNHlb2LiTw4",
    media: "https://lh3.googleusercontent.com/aida-public/AB6AXuDcLHyZYvlzL8PrEXlwGrcxan-3jlaAslmDL7LmL0G1eeeO7XSdKhKkLKjj34MSDxFh_3SHxy927BFiq5lJIC17x8odnRgBWJa_sc4oFr8Dkp1Ev06my5kojUTQ_33gGKASI-jrQTFE8b2UKJeB7VpbsveicstEDhv8iSKOyUwOQtNMFkWiDrg8hK98Rd6vPVQf-uPGTppxhaeM-pz_VbcuKDEEKNqLLmJLHyCNg8uJ",
    drawerKey: 'resort'
  }
];

export const COMMENTS_MOCK: CommentItem[] = [
  {
    author: "Julian Vance",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBQh5X09cSvoo1sZe3q6rvW1QwW9uj_5pQzLPBePPzrA14DNB9upT957jjrGrdSNx3rEdMRMhvOooXXcG3Qt7he5fJJ5tg7ZElob1iatSpm43bnPbPm8GkL83UOXu5T5lqmLLKIfk8XeRjyYUVmYw9vmuSfr2d7NPkzuzYNOMAvROxGTwnCMhRJivQwp86ewJfU3aeivl7v8xiNwVixNKF_d9OpTCFQrstG8SbLZiWs",
    time: "2 giờ trước",
    content: "Trực thăng từ Cam Ranh tới Amanoi thật sự 10/10, hoàng hôn vịnh biển đẹp mê mẩn! 🌊✨",
    badgeRing: "ring-sun-gold/50"
  },
  {
    author: "Helena Rostova",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuApqN20IDlIqQhHM-SPmUC6NeVgX2-b-0QO7Uvfn53N0sTBP4oqiEO8qrFlWpKibZDmlq7vE_Irmxh0wvsNi7pS4u6oqXtdgteepplfJrngBqVTzryrlrdPHHfvO_dBtrtN3QFuASE0tumm3L2HdodmNCS1bD1fQknYHU3Vr2MML8jPpjDlRmucXZgb5C5m4rpmtywbkP8tVaAkJHd56NLNsiukihNgVi8eNj5JZgH6",
    time: "5 giờ trước",
    content: "Bữa tối vách đá Cliffside Sunset Dining đẹp tuyệt mỹ, dịch vụ rất chu đáo!",
    badgeRing: "ring-emerald-400/50"
  }
];

export const LIVE_CARDS_MOCK: LiveStreamCard[] = [
  {
    hostName: "@dan_traveler",
    hostAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcX4LmeaBlJhooA01_VxoVD7P3LJiLIvuprIqEhcJCGVidT2pHsr2WQ-7byWCknGy9MYgRgd3rvgNktoG-gbw32-O6gSMhpWJ9ztnNoTtls1hVsDNwz3CDbH5o_amNNFsGsjT9zlJiXwoUJ-NP-PqOe1kfHJbeSIU-ogQYr1w2YMirw9adzojz7D8Z0D6IgkhvOT8KEn7cwJPhAXWiYk1hw42a08XD08k5EIzC8glg",
    location: "Phú Quốc • Premier Village",
    title: "LIVE: Trải nghiệm hồ bơi vô cực & Sunset Party tại Phú Quốc",
    viewerCount: "3.4K",
    coverImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcX4LmeaBlJhooA01_VxoVD7P3LJiLIvuprIqEhcJCGVidT2pHsr2WQ-7byWCknGy9MYgRgd3rvgNktoG-gbw32-O6gSMhpWJ9ztnNoTtls1hVsDNwz3CDbH5o_amNNFsGsjT9zlJiXwoUJ-NP-PqOe1kfHJbeSIU-ogQYr1w2YMirw9adzojz7D8Z0D6IgkhvOT8KEn7cwJPhAXWiYk1hw42a08XD08k5EIzC8glg"
  },
  {
    hostName: "@minh_lux",
    hostAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAz_2c686xsoV--gpjhwirckHNngbFtaTmw-qWjmkB9EqARjFeByKFr0HiyzR-w6rokA6FIn6tFjlbjzsrYV_P6ZBvIUhw0Q-P26UqpRVOEgcBjMm6Yikz6RLTo5LSHZMn902YdajfCwINFAaKapePoaXJeUoMyOg8Wyqm0aEWu6EYNsAKo67oI-62HnYLRKVKDlyHklAOKna9HpTu6q4Dd_FRkOvTgTvPaZI1vdl1x",
    location: "Đà Nẵng • InterContinental",
    title: "LIVE: Khám phá Villa Vườn Mây & Đón Hoàng Hôn Đà Nẵng",
    viewerCount: "2.8K",
    coverImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuAz_2c686xsoV--gpjhwirckHNngbFtaTmw-qWjmkB9EqARjFeByKFr0HiyzR-w6rokA6FIn6tFjlbjzsrYV_P6ZBvIUhw0Q-P26UqpRVOEgcBjMm6Yikz6RLTo5LSHZMn902YdajfCwINFAaKapePoaXJeUoMyOg8Wyqm0aEWu6EYNsAKo67oI-62HnYLRKVKDlyHklAOKna9HpTu6q4Dd_FRkOvTgTvPaZI1vdl1x"
  },
  {
    hostName: "@chi_journey",
    hostAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBIeKURRLWzLi4fM7Qink9hN-_5Xz-TeIIexrDKJYF664k-2FSqo4uwAYxwX_kybXTpJwRzMpmcJqvgWkEQ2fov0Rs8sL_3VzAnSYm6FCPpSLk1EEulOoYlkYmDlIiPabKP8dl3AD5ncXQNp_eMR7BAVr-ecpf7tKG-C5ah78Vb6WOdhwZ-qorNUkCUl8NfJyD-xDpI6KdySnRtmcmI2y-7kDCIWSkYGVtZB-3UB6Zy",
    location: "Ninh Bình • Tràng An Eco",
    title: "LIVE: Chèo thuyền ngắm hoàng hôn Tràng An cổ tích",
    viewerCount: "1.9K",
    coverImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBIeKURRLWzLi4fM7Qink9hN-_5Xz-TeIIexrDKJYF664k-2FSqo4uwAYxwX_kybXTpJwRzMpmcJqvgWkEQ2fov0Rs8sL_3VzAnSYm6FCPpSLk1EEulOoYlkYmDlIiPabKP8dl3AD5ncXQNp_eMR7BAVr-ecpf7tKG-C5ah78Vb6WOdhwZ-qorNUkCUl8NfJyD-xDpI6KdySnRtmcmI2y-7kDCIWSkYGVtZB-3UB6Zy"
  }
];